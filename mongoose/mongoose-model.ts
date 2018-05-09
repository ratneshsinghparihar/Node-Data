﻿import Mongoose = require("mongoose");
import Q = require('q');
import { EntityChange } from '../core/enums/entity-change';
import { getEntity, repoFromModel } from '../core/dynamic/model-entity';
import * as Enumerable from 'linq';
import { winstonLog } from '../logging/winstonLog';
import * as mongooseHelper from './mongoose-model-helper';
import * as CoreUtils from "../core/utils";
import { ConstantKeys } from '../core/constants';
import * as Utils from './utils';
import { QueryOptions } from '../core/interfaces/queryOptions';
import { MetaUtils } from "../core/metadata/utils";
import { Decorators } from '../core/constants/decorators';
import { GetRepositoryForName, DynamicRepository } from '../core/dynamic/dynamic-repository';
import {_arrayPropListSchema} from './dynamic-schema';
import { MetaData } from '../core/metadata/metadata';
import {ShardInfo} from '../core/interfaces/shard-Info';
import {InstanceService} from '../core/services/instance-service';

/**
 * Iterate through objArr and check if any child object need to be added. If yes, then add those child objects.
 * Bulk create these updated objects.
 * Usage - Post multiple objects parallely
 * @param model
 * @param objArr
 */
export function bulkPost(model: Mongoose.Model<any>, objArr: Array<any>, batchSize?: number): Q.Promise<any> {
    if (!objArr) {
        return Q.when([]);
    }
    if (objArr && objArr.length <= 0) {
        return Q.when([]);
    }

    //console.log("bulkPost " + model.modelName);
    mongooseHelper.updateWriteCount();
    var addChildModel = [];

    // create all cloned models
    var clonedModels = [];
    let transientProps = mongooseHelper.getAllTransientProps(model);
    Enumerable.from(objArr).forEach(obj => {
        var cloneObj = mongooseHelper.removeGivenTransientProperties(model, obj, transientProps);
        cloneObj[ConstantKeys.TempId] = cloneObj._id ? cloneObj._id : Utils.autogenerateIds(model);
        clonedModels.push(cloneObj);
    });
    return mongooseHelper.addChildModelToParent(model, clonedModels)
        .then(result => {
            // autogenerate ids of all the objects
            //Enumerable.from(clonedModels).forEach(clonedObj => {
            //    try {
            //        mongooseHelper.autogenerateIdsForAutoFields(model, clonedObj);
            //        //Object.assign(obj, clonedObj);
            //    } catch (ex) {
            //        winstonLog.logError(`Error in bulkPost ${ex}`);
            //        return Q.reject(ex);
            //    }
            //});

            var asyncCalls = [];
            if (!batchSize) batchSize = 1000;
            for (let curCount = 0; curCount < clonedModels.length; curCount += batchSize) {
                asyncCalls.push(executeBulk(model, clonedModels.slice(curCount, curCount + batchSize)))
            }
            return Q.allSettled(asyncCalls).then(suces => {
                let values = [];
                values = suces.map(x => x.value).reduce((prev, current) => {
                    return prev.concat(current);
                });
                //console.log("bulkPost end" + model.modelName);
                return values;
            }).catch(er => {
                winstonLog.logError(`Error in bulkPost ${model.modelName}: ${er}`);
                throw er;
            });
        });
}

function executeBulk(model, arrayOfDbModels: Array<any>) {
    //console.log("start executeBulk post", model.modelName);
    let executeBulkPost = {};
    arrayOfDbModels.forEach(x => {
        if (x[ConstantKeys.TempId]) {
            x._id = x[ConstantKeys.TempId]
            delete x[ConstantKeys.TempId]
        }
        mongooseHelper.setUniqueIdFromShard(x);
        mongooseHelper.setShardCondition(model, x);
        let newModel = mongooseHelper.getNewModelFromObject(model, x);
        if (!executeBulkPost[newModel.modelName]) {
            executeBulkPost[newModel.modelName] = { objs: [], model: newModel };
        }
        executeBulkPost[newModel.modelName].objs.push(x);
        if (!_arrayPropListSchema[model.modelName]) {
            return;
        }
        // assign empty array for not defined properties
        _arrayPropListSchema[model.modelName].forEach(prop => {
            if (!x[prop]) {
                x[prop] = [];
            }
        });
    });
    let asycnCalls = [];
    Object.keys(executeBulkPost).forEach(x => {
        asycnCalls.push(Q.nbind(executeBulkPost[x].model.collection.insertMany, executeBulkPost[x].model.collection)(executeBulkPost[x].objs));
    });
    //console.log("empty array executeBulk ", model.modelName);
    return Q.allSettled(asycnCalls).then(result => {
        //console.log("end executeBulk post", model.modelName);
        let values = [];
        values = result.map(x => x.value.ops).reduce((prev, current) => {
            return prev.concat(current);
        });
        return values;
    }).catch(err => {
        throw err;
    });
}

/**
 * Iterate through objArr and call put for these
 * Usage - Update multiple object sequentially
 * @param model
 * @param objArr
 */
export function bulkPut(model: Mongoose.Model<any>, objArr: Array<any>, batchSize?: number, donotLoadChilds?: boolean): Q.Promise<any> {
    if (!objArr || !objArr.length) return Q.when([]);
    //console.log("bulkPut " + model.modelName);
    mongooseHelper.updateWriteCount();
    var asyncCalls = [];
    var length = objArr.length;
    var ids = objArr.map(x => x._id);
    var bulk = model.collection.initializeUnorderedBulkOp();
    var asyncCalls = [];
    if (!batchSize) {
        asyncCalls.push(executeBulkPut(model, objArr, donotLoadChilds));
    } else {
        for (let curCount = 0; curCount < objArr.length; curCount += batchSize) {
            asyncCalls.push(executeBulkPut(model, objArr.slice(curCount, curCount + batchSize), donotLoadChilds))
        }
    }

    return Q.allSettled(asyncCalls).then(suces => {
        let values = [];
        values = suces.map(x => x.value).reduce((prev, current) => {
            return prev.concat(current);
        });
        //console.log("bulkPut end" + model.modelName);
        return values;
    }).catch(er => {
        winstonLog.logError(`Error in bulkPut ${model.modelName}: ${er}`);
        throw er;
    });
}

function executeBulkPut(model: Mongoose.Model<any>, objArr: Array<any>, donotLoadChilds?: boolean) {
    let length = objArr.length;
    var asyncCalls = [];
    let fullyLoaded = objArr && objArr.length > 0 && objArr[0][ConstantKeys.FullyLoaded];
    let updateParentRequired = [];
    var objectIds = [];
    //console.log("bulkPut addChildModelToParent child start" + model.modelName);
    let allUpdateProps = [];
    return mongooseHelper.addChildModelToParent(model, objArr).then(r => {
        //console.log("bulkPut addChildModelToParent child end" + model.modelName);
        let transientProps = mongooseHelper.getAllTransientProps(model);
        var metaArr = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
        let isRelationsExist = false;

        if (metaArr && metaArr.length) {
            isRelationsExist = true;
        }
        //let updatePropsReq = !fullyLoaded || isRelationsExist;
        // check if not relationship present in the docs then do not call updateProps
        // 

        let allBulkExecute = {}; 
        for (let i = 0; i < objArr.length; i++) {
            let result = objArr[i];
            let newModel = mongooseHelper.getNewModelFromObject(model, result);
            var objectId = Utils.getCastObjectId(newModel, result._id);
            objectIds.push(objectId);
            let id = result._id;
            let parent = result.parent;

            if (!allBulkExecute[newModel.modelName]) {
                allBulkExecute[newModel.modelName] = newModel.collection.initializeUnorderedBulkOp();
            }
            let bulk = allBulkExecute[newModel.modelName];

            delete result._id;
            delete result[ConstantKeys.FullyLoaded];
            for (let prop in transientProps) {
                delete result[transientProps[prop].propertyKey];
            }
            var updatedProps;
            updatedProps = Utils.getUpdatedProps(result, EntityChange.put);

            // //console.log("update props", updatedProps);
            delete result.__dbEntity;
            // update only modified objects
            if (Object.keys(updatedProps).length === 0) {
                continue;
            }
            updateParentRequired.push(objectId);
            //if (updatePropsReq) {
            //    updatedProps = Utils.getUpdatedProps(result, EntityChange.put);
            //    // update only modified objects
            //    if (Object.keys(updatedProps).length === 0) {
            //        continue;
            //    }
            //}

            let isDecoratorPresent = isDecoratorApplied(model, Decorators.OPTIMISTICLOCK, "put");
            let query: Object = { _id: objectId };
            if (isDecoratorPresent === true) {
                updatedProps["$set"] && delete updatedProps["$set"]["__v"];
                updatedProps["$inc"] = { '__v': 1 };
                query["__v"] = result["__v"];
            }
            bulk.find(mongooseHelper.setShardCondition(model, { _id: objectId })).update(updatedProps);
        }
        let asyncCalls = [];
        //let promBulkUpdate = Q.when({});
        //console.log("bulkPut bulk.execute start" + model.modelName);
        if (updateParentRequired.length > 0) {
            Object.keys(allBulkExecute).forEach(x => {
                let bulk = allBulkExecute[x];
                asyncCalls.push(Q.nbind(bulk.execute, bulk)());
            });
        }
        return Q.allSettled(asyncCalls).then(result => {
            //return promBulkUpdate.then(result => {
            //console.log("bulkPut bulk.execute end" + model.modelName);

            // update parent
            let repo: DynamicRepository = repoFromModel[model.modelName];
            let prom;
            if (fullyLoaded) {
                // remove eagerloading propeties because it will be used for updating parent
                // validate that no one have tampered the new persistent entity
                prom = Q.when(objArr);
                objectIds.forEach((id, index) => {
                    objArr[index]['_id'] = id;
                });
            }
            else {
                prom = findMany(model, objectIds);
            }
            return prom.then((objects: Array<any>) => {
                let updateParentProm = Q.when([]);
                if (updateParentRequired.length > 0) {
                    let updateObject = [];
                    updateParentRequired.forEach(x => {
                        updateObject.push(objects.find(obj => obj._id.toString() == x));
                    });
                    updateParentProm = mongooseHelper.updateParent(model, updateObject);
                }
                return updateParentProm.then(res => {
                    //console.log("bulkPut updateParent start" + model.modelName);
                    if (donotLoadChilds === true) {
                        return Q.when(objects);
                    }
                    return mongooseHelper.fetchEagerLoadingProperties(model, objects).then(resultObject => {
                        return resultObject;
                    });
                });
            });

        });
    }).catch(error => {
        winstonLog.logError(`Error in executeBulkPut ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}



/**
 * Iterate through objArr and call put for these
 * Usage - Update multiple object sequentially
 * @param model
 * @param objArr
 */
export function bulkPatch(model: Mongoose.Model<any>, objArr: Array<any>): Q.Promise<any> {
    if (!objArr || !objArr.length) return Q.when([]);
    //console.log("bulkPatch " + model.modelName);
    mongooseHelper.updateWriteCount();
    var asyncCalls = [];
    var length = objArr.length;
    var ids = objArr.map(x => x._id);

    var asyncCalls = [];

    return mongooseHelper.addChildModelToParent(model, objArr).then(x => {
        let transientProps = mongooseHelper.getAllTransientProps(model);
        let jsonProps = mongooseHelper.getEmbeddedPropWithFlat(model).map(x => x.propertyKey);

        //it has to be group by
        let allBulkExecute = {};
        objArr.forEach(result => {
            var objectId = Utils.getCastObjectId(model, result._id);
            let newModel = mongooseHelper.getNewModelFromObject(model, result);
            if (!allBulkExecute[newModel.modelName]) {
                allBulkExecute[newModel.modelName] = newModel.collection.initializeUnorderedBulkOp();
            }
            let bulk = allBulkExecute[newModel.modelName];

            delete result._id;
            for (let prop in transientProps) {
                delete result[transientProps[prop].propertyKey];
            }
            var updatedProps = Utils.getUpdatedProps(result, EntityChange.patch, jsonProps);
            let isDecoratorPresent = isDecoratorApplied(model, Decorators.OPTIMISTICLOCK, "patch");
            let query: Object = { _id: objectId };
            if (isDecoratorPresent === true) {
                updatedProps["$set"] && delete updatedProps["$set"]["__v"];
                updatedProps["$inc"] = { '__v': 1 };
                query["__v"] = result["__v"];
            }
            bulk.find(mongooseHelper.setShardCondition(model, query)).update(updatedProps);
        });
        let asyncCalls = [];
        Object.keys(allBulkExecute).forEach(x => {
            let bulk = allBulkExecute[x];
            asyncCalls.push(Q.nbind(bulk.execute, bulk)());
        });
        return Q.allSettled(asyncCalls).then(result => {
            // update parent
            return findMany(model, ids).then((objects: Array<any>) => {
                return mongooseHelper.updateParent(model, objects).then(res => {
                    return mongooseHelper.fetchEagerLoadingProperties(model, objects).then(resultObject => {
                        //console.log("bulkPatch end" + model.modelName);
                        return resultObject;
                    });
                });
            });
        }).catch(error => {
            winstonLog.logError(`Error in bulkPatch ${model.modelName}: ${error}`);
            return Q.reject(error);
        });
    });
}

/**
 * Bulk update objects. Find updated objects, and update the parent docs
 * Usage - Update multiple objects parallely with same porperty set
 * @param model
 * @param objIds
 * @param obj
 */
export function bulkPutMany(model: Mongoose.Model<any>, objIds: Array<any>, obj: any): Q.Promise<any> {
    if (!objIds || !objIds.length) return Q.when([]);
    //console.log("bulkPutMany " + model.modelName);
    mongooseHelper.updateWriteCount();
    delete obj._id;
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    var cond = {};
    cond['_id'] = {
        $in: objIds
    };
    cond = mongooseHelper.setShardCondition(model, cond);
    var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.put);
    let newModels = mongooseHelper.getAllShardModelsFromIds(model, objIds);
    let asyncCalls = [];
    Object.keys(newModels).forEach(x => {
        asyncCalls.push(Q.nbind(newModels[x].update, newModels[x])(cond, updatedProps, { multi: true }));
    });
    return Q.allSettled(asyncCalls)
        .then(result => {
            let allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
            let ref = allReferencingEntities.find((x: MetaData) => x.params && x.params.embedded);
            if (ref) {
                return findMany(model, objIds).then((objects: Array<any>) => {
                    return mongooseHelper.updateParent(model, objects).then(res => {
                        //console.log("bulkPutMany end" + model.modelName);
                        return objects;
                    });
                });
            }
            else {
                //console.log("bulkPutMany end" + model.modelName);
                return result;
            }
        }).catch(error => {
            winstonLog.logError(`Error in bulkPutMany ${model.modelName}: ${error}`);
            return Q.reject(error);
        });
}

/**
 * Usage - Find all the objects
 * @param model
 */
export function findAll(model: Mongoose.Model<any>): Q.Promise<any> {
    //console.log("findAll " + model.modelName);
    return <any>model.find(mongooseHelper.setShardCondition(model, {})).lean().then(result => {
        //console.log("findAll end" + model.modelName);
        return result;
    }).catch(error => {
        winstonLog.logError(`Error in findAll ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}


/**
 * Query collection and then populate child objects with relationship
 * Usage - Search object with given condition
 * @param model
 * @param query 
 */
export function countWhere(model: Mongoose.Model<any>, query: any): Q.Promise<any> {

    let queryObj = model.find(mongooseHelper.setShardCondition(model, query)).count();
    //winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then(result => {
            // update embedded property, if any
            return Q.resolve(result);
        }).catch(error => {
            winstonLog.logError(`Error in countWhere ${model.modelName}: ${error}`);
            return Q.reject(error);
        });

}

export function distinctWhere(model: Mongoose.Model<any>, query: any): Q.Promise<any> {

    let queryObj = model.find(mongooseHelper.setShardCondition(model, query)).distinct();
    //winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then(result => {
            // update embedded property, if any
            return Q.resolve(result);
        }).catch(error => {
            winstonLog.logError(`Error in distinctWhere ${model.modelName}: ${error}`);
            return Q.reject(error);
        });

}


/**
 * Query collection and then populate child objects with relationship
 * Usage - Search object with given condition
 * @param model
 * @param query
 * @param select {Array<string> | any} In case it is an array of string, it selects the specified keys mentioned in the array. In case  it is an Object, it sets the JS object as the projection key
 * @param sort
 * @param skip
 * @param limit
 */
export function findWhere(model: Mongoose.Model<any>, query: any, select?: Array<string> | any, queryOptions?: QueryOptions, toLoadChilds?: boolean, sort?: any, skip?: number, limit?: number): Q.Promise<any> {
    //console.log("findWhere " + model.modelName);
    let lt: string, gt: string, lte: string, gte: string, lt_value: number, lte_value: number, gt_value: number, gte_value: number;
    var sel = {};
    let order = undefined;
    if (select instanceof Array) {
        select.forEach(x => {
            sel[x] = 1;
        });
    }
    else if (select) {
        sel = select;
    }
    if (queryOptions) {
        if (queryOptions.limit != null)
            limit = Number.parseInt(queryOptions.limit.toString());

        if (queryOptions.skip != null)
            skip = Number.parseInt(queryOptions.skip.toString());

		
		  if (queryOptions.lt != null) {
            lt = queryOptions.lt;
        }

        if (queryOptions.gt != null) {
            gt = queryOptions.gt;
        }

        if (queryOptions.lt_value != null) {
            lt_value = Number.parseInt(queryOptions.lt_value);
        }

        if (queryOptions.gt_value != null) {
            gt_value = Number.parseInt(queryOptions.gt_value);
        }

        if (queryOptions.lt != null) {
            lte = queryOptions.lte;
        }

        if (queryOptions.gt != null) {
            gte = queryOptions.gte;
        }

        if (queryOptions.lt_value != null) {
            lte_value = Number.parseInt(queryOptions.lte_value);
        }

        if (queryOptions.gt_value != null) {
            gte_value = Number.parseInt(queryOptions.gte_value);
        }
		
		
        if (queryOptions.sort != null) {
            sort = queryOptions.sort;
            if (queryOptions.order != null && queryOptions.order === 'desc') {
                let descSort = {};
                descSort[sort] = -1;
                sort = descSort;
            }
        }
    }

    let newModels = {};
    let obj: ShardInfo = InstanceService.getInstanceFromType(getEntity(model.modelName), true);
    if (obj.getShardKey) {
        let key = obj.getShardKey();
        if (query[key]) {
            if (CoreUtils.isJSON(query[key])) {
                if (query[key]['$in']) {
                    query[key]['$in'].forEach(x => {
                        let newModel = mongooseHelper.getChangedModelForDynamicSchema(model, x);
                        newModels[newModel.modelName] = newModel;
                    });
                }
            }
            else {
                // get shard collection 
                let newModel = mongooseHelper.getChangedModelForDynamicSchema(model, query[key]);
                newModels[newModel.modelName] = newModel;
            }
        }
        if (Object.keys(newModels).length == 0) {
            // find all the collection name and execute the query
            mongooseHelper.getAllTheShards(model).forEach(x => {
                newModels[x.modelName] = x;
            });
        }
    }
    else {
        newModels[model.modelName] = model;
    }
    let asyncCalls = [];
    Object.keys(newModels).forEach(x => {
        let queryObj = newModels[x].find(mongooseHelper.setShardCondition(model, query), sel).lean();
        if (sort) {
            queryObj = queryObj.sort(sort);
        }
        if (skip) {
            queryObj = queryObj.skip(skip);
        }
        if (limit) {
            queryObj = queryObj.limit(limit);
        }
        asyncCalls.push(Q.nbind(queryObj.exec, queryObj)());
    });
    return Q.allSettled(asyncCalls).then(res => {
        let result = [];
        result = res.map(x => x.value).reduce((prev, current) => {
            return prev.concat(current);
        });
        //winstonLog.logInfo(`findWhere query is ${query}`);
        // update embedded property, if any
        if (toLoadChilds != undefined && toLoadChilds == false) {
            mongooseHelper.transformAllEmbeddedChildern1(model, result);
            //console.log("findWhere end" + model.modelName);
            return result;
        }
        var asyncCalls = [];
        asyncCalls.push(mongooseHelper.embeddedChildren1(model, result, false));
        return Q.allSettled(asyncCalls).then(r => {
            //console.log("findWhere end" + model.modelName);
            return result;
        });
    }).catch(error => {
        winstonLog.logError(`Error in findWhere ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
    // winstonLog.logInfo(`findWhere query is ${query}`);
    // return Q.nbind(model.find, model)(query)
    //     .then(result => {
    //         return toObject(result);
    //     }).catch(error => {
    //         winstonLog.logError(`Error in findWhere ${error}`);
    //         return error;
    //     });
}

/**
 * Usage - find object with given object id
 * @param model
 * @param id
 */
export function findOne(model: Mongoose.Model<any>, id, donotLoadChilds?: boolean): Q.Promise<any> {
    //console.log("findOne " + model.modelName);
    let newModel = mongooseHelper.getChangedModelForDynamicSchema(model, id);
    return <any>newModel.findOne(mongooseHelper.setShardCondition(model, { '_id': id })).lean().then(result => {
        return mongooseHelper.embeddedChildren1(model, [result], false, donotLoadChilds)
            .then(r => {
                //console.log("findOne end" + model.modelName);
                return result;
            });
    }).catch(error => {
        winstonLog.logError(`Error in findOne ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}

/**
 * Usage - find the object with given {property : value}
 * @param model
 * @param fieldName
 * @param value
 */
export function findByField(model: Mongoose.Model<any>, fieldName, value): Q.Promise<any> {
    //console.log("findByField " + model.modelName);
    var param = {};
    param[fieldName] = value;
    return <any>model.findOne(mongooseHelper.setShardCondition(model, param)).lean().then(result => {
        return mongooseHelper.embeddedChildren1(model, [result], false)
            .then(r => {
                //console.log("findByField end" + model.modelName);
                return result;
            });
    },
        err => {
            winstonLog.logError(`Error in findByField ${model.modelName}: ${err}`);
            return Q.reject(err);
        });
}

/**
 * Usage - Find all the objects with given ids
 * @param model
 * @param ids
 */
export function findMany(model: Mongoose.Model<any>, ids: Array<any>, toLoadEmbeddedChilds?: boolean) {
    if (!ids || !ids.length) return Q.when([]);
    //console.log("findMany " + model.modelName);
    if (toLoadEmbeddedChilds == undefined) {
        toLoadEmbeddedChilds = false;
    }
    let newModels = mongooseHelper.getAllShardModelsFromIds(model, ids);
    let asyncCalls = [];
    Object.keys(newModels).forEach(x => {
        asyncCalls.push(<any>newModels[x].find(mongooseHelper.setShardCondition(model, {
            '_id': {
                $in: ids.map(x => Utils.getCastObjectId(model, x))
            }
        })).lean());
    });
    return Q.allSettled(asyncCalls).then(res => {
        let result = [];
        result = res.map(x => x.value).reduce((prev, current) => {
            return prev.concat(current);
        });
        if (result.length !== ids.length) {
            let oneId = "";
            if (ids && ids.length) {
                oneId = ids[0];
            }
            var error = 'findmany - numbers of items found:' + result.length + 'number of items searched: ' + ids.length + ' for model: ' + model.modelName + ' one of the id searched is: ' + oneId;
            winstonLog.logError(`Error in findMany ${error}`);
            return Q.reject(error);
        }
        if (toLoadEmbeddedChilds) {
            let asyncCalls = [];
            asyncCalls.push(mongooseHelper.embeddedChildren1(model, result, false));
            //console.log("findMany end" + model.modelName);
            return Q.allSettled(asyncCalls).then(r => {
                return result;
            });
        } else {
            mongooseHelper.transformAllEmbeddedChildern1(model, result);
            //console.log("findMany end" + model.modelName);
            return result;
        }
    }).catch(error => {
        winstonLog.logError(`Error in findMany ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}

/**
 * find object with the given id.
 * Check if property has a relationship. If yes, then find all the child objects and return child
 * @param model
 * @param id
 * @param prop
 */
export function findChild(model: Mongoose.Model<any>, id, prop): Q.Promise<any> {
    //console.log("findChild " + model.modelName);
    let newModel = mongooseHelper.getChangedModelForDynamicSchema(model, id);
    return <any>newModel.findOne(mongooseHelper.setShardCondition(model, { '_id': id })).lean().then(res => {
        var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
        if (Enumerable.from(metas).any(x => x.propertyKey == prop)) {
            // create new object and add only that property for which we want to do eagerloading
            var result = {};
            result[prop] = res;
            return mongooseHelper.embeddedChildren1(model, [result], true)
                .then(r => {
                    //console.log("findChild end" + model.modelName);
                    return result[prop];
                });
        }
        //console.log("findChild end" + model.modelName);
        return res;
    }).catch(error => {
        winstonLog.logError(`Error in findChild ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}

/**
 * case 1: all new - create main item and child separately and embed if true
 * case 2: some new, some update - create main item and update/create child accordingly and embed if true
 * @param obj
 */
export function post(model: Mongoose.Model<any>, obj: any): Q.Promise<any> {
    //console.log("post " + model.modelName);
    mongooseHelper.updateWriteCount();
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    clonedObj[ConstantKeys.TempId] = clonedObj._id ? clonedObj._id : Utils.autogenerateIds(model);
    return mongooseHelper.addChildModelToParent(model, [clonedObj])
        .then(result => {
            //try {
            //    mongooseHelper.autogenerateIdsForAutoFields(model, clonedObj);
            //    //Object.assign(obj, clonedObj);
            //} catch (ex) {
            //    //console.log(ex);
            //    return Q.reject(ex);
            //}
            if (clonedObj[ConstantKeys.TempId]) {
                clonedObj._id = clonedObj[ConstantKeys.TempId];
                delete clonedObj[ConstantKeys.TempId];
            }
            mongooseHelper.setUniqueIdFromShard(clonedObj);
            mongooseHelper.setShardCondition(model, clonedObj);
            // assign empty array for not defined properties
            if (_arrayPropListSchema[model.modelName]) {
                _arrayPropListSchema[model.modelName].forEach(prop => {
                    if (!clonedObj[prop]) {
                        clonedObj[prop] = [];
                    }
                });
            }
            let newModel = mongooseHelper.getNewModelFromObject(model, clonedObj);
            return Q.nbind(newModel.create, newModel)(clonedObj).then(result => {
                let resObj = Utils.toObject(result);
                Object.assign(obj, resObj);
                return mongooseHelper.embeddedChildren1(model, [obj], false)
                    .then(r => {
                        //console.log("post end " + model.modelName);
                        return obj;
                    });

            });
        }).catch(error => {
            winstonLog.logError(`Error in post ${model.modelName}: ${error}`);
            return Q.reject(error);
        });
}
/**
 * Delete object with given id. Check if, any children have deletecase=true, then delete children from master table
 * Update parent document for all the deleted objects
 * Usage - Delete object given id
 * @param model
 * @param id
 */
export function del(model: Mongoose.Model<any>, id: any): Q.Promise<any> {
    //console.log("delete " + model.modelName);
    let newModel = mongooseHelper.getChangedModelForDynamicSchema(model, id);
    return <any>newModel.findByIdAndRemove(mongooseHelper.setShardCondition(model, { '_id': id })).lean().then((response: any) => {
        return mongooseHelper.deleteCascade(model, [response]).then(x => {
            return mongooseHelper.deleteEmbeddedFromParent(model, EntityChange.delete, [response])
                .then(res => {
                    //console.log("delete end" + model.modelName);
                    return ({ delete: 'success' });
                });
        });
    })
        .catch(err => {
            winstonLog.logError(`delete failed ${model.modelName}: ${err}`);
            return Q.reject({ delete: 'failed', error: err });
        });
}

/**
 * Sequetially delete the objects
 * @param modelte
 * @param ids
 */
export function bulkDel(model: Mongoose.Model<any>, objs: Array<any>): Q.Promise<any> {
    //console.log("bulkDel " + model.modelName);
    var asyncCalls = [];
    var ids = [];
    Enumerable.from(objs).forEach(x => {
        if (CoreUtils.isJSON(x)) {
            ids.push(x._id);
        }
        else {
            ids.push(x);
        }
    });
    if (!ids || !ids.length) return Q.when([]);
    let newModels = mongooseHelper.getAllShardModelsFromIds(model, ids);
    Object.keys(newModels).forEach(x => {
        asyncCalls.push(<any>newModels[x].find(mongooseHelper.setShardCondition(model, {
            '_id': {
                $in: ids
            }
        })).lean());
    });
    return Q.allSettled(asyncCalls).then(res => {
        let parents = [];
        parents = res.map(x => x.value).reduce((prev, current) => {
            return prev.concat(current);
        });
        asyncCalls = [];
        Object.keys(newModels).forEach(x => {
            asyncCalls.push(Q.nbind(newModels[x].remove, newModels[x])(mongooseHelper.setShardCondition(model, {
                '_id': {
                    $in: ids
                }
            })));
        });
        return Q.allSettled(asyncCalls).then(result => {
            return mongooseHelper.deleteCascade(model, parents).then(success => {
                let asyncCalls = [];
                return mongooseHelper.deleteEmbeddedFromParent(model, EntityChange.delete, parents).then(x => {
                    //console.log("bulkDel end" + model.modelName);
                    return ({ delete: 'success' });
                });
            });
        }).catch(err => {
            winstonLog.logError(`bulkDel failed ${model.modelName}: ${err}`);
            return Q.reject('bulkDel failed');
        });
    });
}

/**
 * Check if any child object need to be added, if yes, then add those child objects.
 * update the object with propertie. And then update the parent objects.
 * Usage - Update the object with given object id
 * @param model
 * @param id
 * @param obj
 */
export function put(model: Mongoose.Model<any>, id: any, obj: any): Q.Promise<any> {
    //console.log("put " + model.modelName);
    // Mayank - Check with suresh how to reject the changes in optimistic locking
    return bulkPut(model, [obj]).then((res: Array<any>) => {
        if (res.length) {
            //this merging is wrong, as we cannnot send transient props in API rsult.Inconsistency @Ratnesh sugestion
            Object.assign(obj, res[0]);
            //console.log("put end" + model.modelName);
            return obj;
        }
        //console.log("put end" + model.modelName);
        return [];
    }).catch(error => {
        winstonLog.logError(`Error in put ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}

/**
 * Check if any child object need to be added, if yes, then add those child objects.
 * update the object with propertie. And then update the parent objects.
 * Usage - Update the object with given object id
 * @param model
 * @param id
 * @param obj
 */
export function patch(model: Mongoose.Model<any>, id: any, obj): Q.Promise<any> {
    //console.log("patch " + model.modelName);
    // need to set id in case id is not supplied in patched obj
    obj._id = id;
    // Mayank - Check with suresh how to reject the changes in optimistic locking
    return bulkPatch(model, [obj]).then((res: Array<any>) => {
        if (res.length)
            return res[0];
        return [];
    }).catch(error => {
        winstonLog.logError(`Error in patch ${model.modelName}: ${error}`);
        return Q.reject(error);
    });
}

/**
 * Check whether decorator is applied or not.
 * @param path
 * @param decorator
 * @param propertyKey
 */
function isDecoratorApplied(model: Mongoose.Model<any>, decorator: string, propertyKey: string) {
    var isDecoratorPresent: boolean = false;
    let repo = repoFromModel[model.modelName];
    var repoEntity = repo && repo.getEntityType();
    var optimisticLock = repoEntity && MetaUtils.getMetaData(repoEntity, decorator, propertyKey);
    if (optimisticLock) {
        isDecoratorPresent = true;
    }
    return isDecoratorPresent;
}