import Mongoose = require("mongoose");
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

/**
 * Iterate through objArr and check if any child object need to be added. If yes, then add those child objects.
 * Bulk create these updated objects.
 * Usage - Post multiple objects parallely
 * @param model
 * @param objArr
 */
export function bulkPost(model: Mongoose.Model<any>, objArr: Array<any>, batchSize?: number): Q.Promise<any> {
    console.log("bulkPost " + model.modelName);
    mongooseHelper.updateWriteCount();
    var addChildModel = [];

    // create all cloned models
    var clonedModels = [];
    let transientProps = mongooseHelper.getAllTransientProps(model);
    Enumerable.from(objArr).forEach(obj => {
        var cloneObj = mongooseHelper.removeGivenTransientProperties(model, obj, transientProps);
        cloneObj[ConstantKeys.TempId] = cloneObj._id ? cloneObj._id : new Mongoose.Types.ObjectId();
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
                return values;
            }).catch(er => {
                throw er;
            });
        });
}

function executeBulk(model, arrayOfDbModels: Array<any>) {
    console.log("start executeBulk", model.modelName);
    arrayOfDbModels.forEach(x => {
        if (x[ConstantKeys.TempId]) {
            x._id = x[ConstantKeys.TempId]
            delete x[ConstantKeys.TempId]
        }
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
    console.log("empty array executeBulk ", model.modelName);
    return Q.nbind(model.collection.insertMany, model.collection)(arrayOfDbModels).then((result: any) => {
        console.log("end executeBulk ", model.modelName);
        result = result && result.ops;
        return result;
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
    console.log("bulkPut " + model.modelName);
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
        return values;
    }).catch(er => {
        throw er;
    });
}

function executeBulkPut(model: Mongoose.Model<any>, objArr: Array<any>, donotLoadChilds?: boolean) {
    let length = objArr.length;
    var asyncCalls = [];
    let fullyLoaded = objArr && objArr.length > 0 && objArr[0][ConstantKeys.FullyLoaded];
    var objectIds = [];
    var bulk = model.collection.initializeUnorderedBulkOp();
    return mongooseHelper.addChildModelToParent(model, objArr).then(r => {

        let transientProps = mongooseHelper.getAllTransientProps(model);
        var metaArr = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
        let isRelationsExist = false;

        if (metaArr && metaArr.length) {
            isRelationsExist = true;
        }
        let updatePropsReq = !fullyLoaded || isRelationsExist;
        // check if not relationship present in the docs then do not call updateProps
        // 

        for (let i = 0; i < objArr.length; i++) {
            let result = objArr[i];
            var objectId = new Mongoose.Types.ObjectId(result._id);
            objectIds.push(objectId);
            delete result._id;
            delete result[ConstantKeys.FullyLoaded];
            for (let prop in transientProps) {
                delete result[transientProps[prop].propertyKey];
            }
            var updatedProps;

            if (updatePropsReq) {
                updatedProps = Utils.getUpdatedProps(result, EntityChange.put);
            }
            let isDecoratorPresent = isDecoratorApplied(model, Decorators.OPTIMISTICLOCK, "put");
            let query: Object = { _id: objectId };
            if (isDecoratorPresent === true) {
                updatedProps["$set"] && delete updatedProps["$set"]["__v"];
                updatedProps["$inc"] = { '__v': 1 };
                query["__v"] = result["__v"];
            }
            if (updatePropsReq) {
                bulk.find({ _id: objectId }).update(updatedProps);
            }
            else {
                bulk.find({ _id: objectId }).replaceOne(result);
            }
        }
        return Q.nbind(bulk.execute, bulk)().then(result => {
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
                return mongooseHelper.updateParent(model, objects).then(res => {
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
        winstonLog.logError(`Error in bulkPut ${error}`);
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
    console.log("bulkPatch " + model.modelName);
    mongooseHelper.updateWriteCount();
    var asyncCalls = [];
    var length = objArr.length;
    var ids = objArr.map(x => x._id);
    var bulk = model.collection.initializeUnorderedBulkOp();
    var asyncCalls = [];

    return mongooseHelper.addChildModelToParent(model, objArr).then(x => {
        let transientProps = mongooseHelper.getAllTransientProps(model);
        let jsonProps = mongooseHelper.getEmbeddedPropWithFlat(model).map(x => x.propertyKey);
        objArr.forEach(result => {
            var objectId = new Mongoose.Types.ObjectId(result._id);
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
            bulk.find(query).update(updatedProps);
        });
        return Q.nbind(bulk.execute, bulk)().then(result => {
            // update parent
            return findMany(model, ids).then((objects: Array<any>) => {
                return mongooseHelper.updateParent(model, objects).then(res => {
                    return mongooseHelper.fetchEagerLoadingProperties(model, objects).then(resultObject => {
                        return resultObject;
                    });
                });
            });
        }).catch(error => {
            winstonLog.logError(`Error in bulkPut ${error}`);
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
    console.log("bulkPutMany " + model.modelName);
    mongooseHelper.updateWriteCount();
    delete obj._id;
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    var cond = {};
    cond['_id'] = {
        $in: objIds
    };
    var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.put);
    return Q.nbind(model.update, model)(cond, updatedProps, { multi: true })
        .then(result => {
            return findMany(model, objIds).then((objects: Array<any>) => {
                return mongooseHelper.updateParent(model, objects).then(res => {
                    return objects;
                });
            });
        }).catch(error => {
            winstonLog.logError(`Error in put ${error}`);
            return Q.reject(error);
        });
}

/**
 * Usage - Find all the objects
 * @param model
 */
export function findAll(model: Mongoose.Model<any>): Q.Promise<any> {
    console.log("findAll " + model.modelName);
    return <any>model.find({}).lean().then(result => {
        return result;
    }).catch(error => {
        winstonLog.logError(`Error in findAll ${error}`);
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

    let queryObj = model.find(query).count();
    //winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then(result => {
            // update embedded property, if any
            return Q.resolve(result);
        }).catch(error => {
            winstonLog.logError(`Error in countWhere ${error}`);
            return Q.reject(error);
        });

}

export function distinctWhere(model: Mongoose.Model<any>, query: any): Q.Promise<any> {

    let queryObj = model.find(query).distinct();
    //winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then(result => {
            // update embedded property, if any
            return Q.resolve(result);
        }).catch(error => {
            winstonLog.logError(`Error in distinctWhere ${error}`);
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
    console.log("findWhere " + model.modelName);
    var sel = {};
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
            limit = queryOptions.limit;

        if (queryOptions.skip != null)
            skip = queryOptions.skip;

        if (queryOptions.sort != null)
            sort = queryOptions.sort;
    }

    let queryObj = model.find(query, sel).lean();
    if (sort) {
        queryObj = queryObj.sort(sort);
    }
    if (skip) {
        queryObj = queryObj.skip(skip);
    }
    if (limit) {
        queryObj = queryObj.limit(limit);
    }
    //winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then((result: Array<any>) => {
            // update embedded property, if any
            if (toLoadChilds != undefined && toLoadChilds == false) {
                mongooseHelper.transformAllEmbeddedChildern1(model, result);
                return result;
            }
            var asyncCalls = [];
            asyncCalls.push(mongooseHelper.embeddedChildren1(model, result, false));
            return Q.allSettled(asyncCalls).then(r => {
                return result;
            });
        }).catch(error => {
            winstonLog.logError(`Error in findWhere ${error}`);
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
    console.log("findOne " + model.modelName);
    return <any>model.findOne({ '_id': id }).lean().then(result => {
        return mongooseHelper.embeddedChildren1(model, [result], false, donotLoadChilds)
            .then(r => {
                return result;
            });
    }).catch(error => {
        winstonLog.logError(`Error in findOne ${error}`);
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
    console.log("findByField " + model.modelName);
    var param = {};
    param[fieldName] = value;
    return <any>model.findOne(param).lean().then(result => {
        return mongooseHelper.embeddedChildren1(model, [result], false)
            .then(r => {
                return result;
            });
    },
        err => {
            winstonLog.logError(`Error in findByField ${err}`);
            return Q.reject(err);
        });
}

/**
 * Usage - Find all the objects with given ids
 * @param model
 * @param ids
 */
export function findMany(model: Mongoose.Model<any>, ids: Array<any>, toLoadEmbeddedChilds?: boolean) {
    console.log("findMany " + model.modelName);
    if (toLoadEmbeddedChilds == undefined) {
        toLoadEmbeddedChilds = false;
    }
    return <any>model.find({
        '_id': {
            $in: ids
        }
    }).lean().then((result: Array<any>) => {
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
            return Q.allSettled(asyncCalls).then(r => {
                return result;
            });
        } else {
            mongooseHelper.transformAllEmbeddedChildern1(model, result);
            return result;
        }
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
    console.log("findChild " + model.modelName);
    return <any>model.findOne({ '_id': id }).lean().then(res => {
        var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
        if (Enumerable.from(metas).any(x => x.propertyKey == prop)) {
            // create new object and add only that property for which we want to do eagerloading
            var result = {};
            result[prop] = res;
            return mongooseHelper.embeddedChildren1(model, [result], true)
                .then(r => {
                    return result[prop];
                });
        }
        return res;
    }).catch(error => {
        winstonLog.logError(`Error in findChild ${error}`);
        return Q.reject(error);
    });
}

/**
 * case 1: all new - create main item and child separately and embed if true
 * case 2: some new, some update - create main item and update/create child accordingly and embed if true
 * @param obj
 */
export function post(model: Mongoose.Model<any>, obj: any): Q.Promise<any> {
    console.log("post " + model.modelName);
    mongooseHelper.updateWriteCount();
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    clonedObj[ConstantKeys.TempId] = clonedObj._id ? clonedObj._id : new Mongoose.Types.ObjectId();
    return mongooseHelper.addChildModelToParent(model, [clonedObj])
        .then(result => {
            //try {
            //    mongooseHelper.autogenerateIdsForAutoFields(model, clonedObj);
            //    //Object.assign(obj, clonedObj);
            //} catch (ex) {
            //    console.log(ex);
            //    return Q.reject(ex);
            //}
            if (clonedObj[ConstantKeys.TempId]) {
                clonedObj._id = clonedObj[ConstantKeys.TempId];
                delete clonedObj[ConstantKeys.TempId];
            }
            // assign empty array for not defined properties
            if (_arrayPropListSchema[model.modelName]) {
                _arrayPropListSchema[model.modelName].forEach(prop => {
                    if (!clonedObj[prop]) {
                        clonedObj[prop] = [];
                    }
                });
            }
            return Q.nbind(model.create, model)(clonedObj).then(result => {
                let resObj = Utils.toObject(result);
                Object.assign(obj, resObj);
                return mongooseHelper.embeddedChildren1(model, [obj], false)
                    .then(r => {
                        return obj;
                    });

            });
        }).catch(error => {
            winstonLog.logError(`Error in post ${error}`);
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
    return <any>model.findByIdAndRemove({ '_id': id }).lean().then((response: any) => {
        return mongooseHelper.deleteCascade(model, [response]).then(x => {
            return mongooseHelper.deleteEmbeddedFromParent(model, EntityChange.delete, [response])
                .then(res => {
                    return ({ delete: 'success' });
                });
        });
    })
        .catch(err => {
            winstonLog.logError(`delete failed ${err}`);
            return Q.reject({ delete: 'failed', error: err });
        });
}

/**
 * Sequetially delete the objects
 * @param modelte
 * @param ids
 */
export function bulkDel(model: Mongoose.Model<any>, objs: Array<any>): Q.Promise<any> {
    console.log("bulkDel " + model.modelName);
    var asyncCalls = [];
    var ids = [];
    var bulk = model.collection.initializeUnorderedBulkOp();
    Enumerable.from(objs).forEach(x => {
        if (CoreUtils.isJSON(x)) {
            ids.push(x._id);
        }
        else {
            ids.push(x);
        }
    });
    ids.forEach(x => {
        bulk.find({ _id: x }).remove();
    });

    return <any>model.find({
        '_id': {
            $in: ids
        }
    }).lean().then((parents: Array<any>) => {
        return Q.nbind(bulk.execute, bulk)()
            .then(result => {
                return mongooseHelper.deleteCascade(model, parents).then(success => {
                    let asyncCalls = [];
                    return mongooseHelper.deleteEmbeddedFromParent(model, EntityChange.delete, parents).then(x => {
                        return ({ delete: 'success' });
                    });
                });
            })
            .catch(err => {
                winstonLog.logError(`bulkDel failed ${err}`);
                return Q.reject('bulkDel failed');
            });
    })
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
/**
 * Check if any child object need to be added, if yes, then add those child objects.
 * update the object with propertie. And then update the parent objects.
 * Usage - Update the object with given object id
 * @param model
 * @param id
 * @param obj
 */
export function put(model: Mongoose.Model<any>, id: any, obj: any): Q.Promise<any> {
    console.log("put " + model.modelName);
    // Mayank - Check with suresh how to reject the changes in optimistic locking
    return bulkPut(model, [obj]).then((res: Array<any>) => {
        if (res.length) {
            //this merging is wrong, as we cannnot send transient props in API rsult.Inconsistency @Ratnesh sugestion
            Object.assign(obj, res[0]);
            return obj;
        }
        return [];
    }).catch(error => {
        winstonLog.logError(`Error in put ${error}`);
        return Q.reject(error);
    });

    //let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    //// First update the any embedded property and then update the model
    //return mongooseHelper.addChildModelToParent(model, clonedObj, id).then(result => {
    //    var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.put);
    //    let isDecoratorPresent = isDecoratorApplied(path, Decorators.OPTIMISTICLOCK, "put");
    //    let query: Object = { '_id': id };
    //    if (isDecoratorPresent === true) {
    //        updatedProps["$set"] && delete updatedProps["$set"]["__v"];
    //        updatedProps["$inc"] = { '__v': 1 };
    //        query["__v"] = obj["__v"];
    //    }
    //    return Q.nbind(model.findOneAndUpdate, model)(query, updatedProps, { new: true })
    //        .then(result => {
    //            if (!result && isDecoratorPresent === true) {
    //                return Q.reject("You are trying to update with stale data,please try again after some time.");
    //            }
    //            return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.put, result, Utils.getPropertiesFromObject(clonedObj))
    //                .then(res => {
    //                    var resObj = Utils.toObject(result);
    //                    return mongooseHelper.fetchEagerLoadingProperties(model, resObj).then(r => {
    //                        Object.assign(obj, r);
    //                        return obj;
    //                    });
    //                });
    //        }).catch(error => {
    //            winstonLog.logError(`Error in put ${error}`);
    //            return Q.reject(error);
    //        });
    //}).catch(error => {
    //    winstonLog.logError(`Error in put ${error}`);
    //    return Q.reject(error);
    //});
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
    console.log("patch " + model.modelName);
    // need to set id in case id is not supplied in patched obj
    obj._id = id;
    // Mayank - Check with suresh how to reject the changes in optimistic locking
    return bulkPatch(model, [obj]).then((res: Array<any>) => {
        if (res.length)
            return res[0];
        return [];
    }).catch(error => {
        winstonLog.logError(`Error in put ${error}`);
        return Q.reject(error);
    });

    //let clonedObj = mongooseHelper.removeTransientProperties(model, obj);

    //// First update the any embedded property and then update the model
    //return mongooseHelper.addChildModelToParent(model, clonedObj, id).then(result => {
    //    var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.patch);
    //    let isDecoratorPresent = isDecoratorApplied(path, Decorators.OPTIMISTICLOCK, "patch");
    //    let query: Object = { '_id': id };
    //    if (isDecoratorPresent === true) {
    //        updatedProps["$set"] && delete updatedProps["$set"]["__v"];
    //        updatedProps["$push"] && delete updatedProps["$push"]["__v"];
    //        updatedProps["$inc"] = { '__v': 1 };
    //        if (obj["__v"]) {
    //            query["__v"] = obj["__v"];
    //        }
    //    }
    //    return Q.nbind(model.findOneAndUpdate, model)(query, updatedProps, { new: true })
    //        .then(result => {
    //            if (!result && isDecoratorPresent === true) {
    //                return Q.reject("You are trying to update with stale data,please try again after some time.");
    //            }
    //            return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.patch, result, Utils.getPropertiesFromObject(clonedObj))
    //                .then(res => {
    //                    var resObj = Utils.toObject(result);
    //                    return mongooseHelper.fetchEagerLoadingProperties(model, resObj).then(r => {
    //                        Object.assign(obj, r);
    //                        return obj;
    //                    });
    //                });
    //        });
    //}).catch(error => {
    //    winstonLog.logError(`Error in patch ${error}`);
    //    return Q.reject(error);
    //});
}