﻿import Mongoose = require("mongoose");
import Q = require('q');
import { EntityChange } from '../core/enums/entity-change';
import { getEntity, repoFromModel } from '../core/dynamic/model-entity';
import * as Enumerable from 'linq';
import { winstonLog } from '../logging/winstonLog';
import * as mongooseHelper from './mongoose-model-helper';
import * as CoreUtils from "../core/utils";
import * as Utils from './utils';
import { QueryOptions } from '../core/interfaces/queryOptions';
import { MetaUtils } from "../core/metadata/utils";
import { Decorators } from '../core/constants/decorators';
import { GetRepositoryForName, DynamicRepository } from '../core/dynamic/dynamic-repository';

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
    Enumerable.from(objArr).forEach(obj => {
        var cloneObj = mongooseHelper.removeTransientProperties(model, obj);
        clonedModels.push(cloneObj);
    });
    return mongooseHelper.addChildModelToParent(model, clonedModels)
        .then(result => {
            // autogenerate ids of all the objects
            Enumerable.from(clonedModels).forEach(clonedObj => {
                try {
                    mongooseHelper.autogenerateIdsForAutoFields(model, clonedObj);
                    //Object.assign(obj, clonedObj);
                } catch (ex) {
                    winstonLog.logError(`Error in bulkPost ${ex}`);
                    return Q.reject(ex);
                }
            });
            var asyncCalls = [];
            if (!batchSize) {
                asyncCalls.push(executeBulk(model, clonedModels));
            } else {
                for (let curCount = 0; curCount < clonedModels.length; curCount += batchSize) {
                    asyncCalls.push(executeBulk(model, clonedModels.slice(curCount, curCount + batchSize)))
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
        });
}

function executeBulk(model, arrayOfDbModels) {
    var newmodels = arrayOfDbModels.map(x => new model(x)).map(x => x._doc);
    return Q.nbind(model.collection.insertMany, model.collection)(newmodels).then((result: any) => {
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
export function bulkPut(model: Mongoose.Model<any>, objArr: Array<any>, batchSize?: number): Q.Promise<any> {
    console.log("bulkPut " + model.modelName);
    mongooseHelper.updateWriteCount();
    var asyncCalls = [];
    var length = objArr.length;
    var ids = objArr.map(x => x._id);
    var bulk = model.collection.initializeUnorderedBulkOp();
    var asyncCalls = [];
    if (!batchSize) {
        asyncCalls.push(executeBulkPut(model, objArr));
    } else {
        for (let curCount = 0; curCount < objArr.length; curCount += batchSize) {
            asyncCalls.push(executeBulkPut(model, objArr.slice(curCount, curCount + batchSize)))
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

function executeBulkPut(model: Mongoose.Model<any>, objArr: Array<any>) {
    let length = objArr.length;
    var asyncCalls = [];
    var ids = objArr.map(x => x._id);
    var bulk = model.collection.initializeUnorderedBulkOp();
    return mongooseHelper.addChildModelToParent(model, objArr).then(r => {
        objArr.forEach(result => {
            var objectId = new Mongoose.Types.ObjectId(result._id);
            delete result._id;
            let clonedObj = mongooseHelper.removeTransientProperties(model, result);
            var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.put);
            let isDecoratorPresent = isDecoratorApplied(model, Decorators.OPTIMISTICLOCK, "put");
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
            let repo: DynamicRepository = repoFromModel[model.modelName];
            return findMany(model, ids).then(objects => {
                return mongooseHelper.updateParent(model, objects).then(res => {
                    asyncCalls = [];
                    var resultObject = [];
                    Enumerable.from(objects).forEach(x => {
                        asyncCalls.push(mongooseHelper.fetchEagerLoadingProperties(model, x).then(r => {
                            resultObject.push(r);
                        }));
                    });
                    return Q.allSettled(asyncCalls).then(final => {
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
        objArr.forEach(result => {
            var objectId = new Mongoose.Types.ObjectId(result._id);
            delete result._id;
            let clonedObj = mongooseHelper.removeTransientProperties(model, result);
            var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.patch);
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
            return findMany(model, ids).then(objects => {
                return mongooseHelper.updateParent(model, objects).then(res => {
                    asyncCalls = [];
                    var resultObject = [];
                    Enumerable.from(objects).forEach(x => {
                        asyncCalls.push(mongooseHelper.fetchEagerLoadingProperties(model, x).then(r => {
                            resultObject.push(r);
                        }));
                    });
                    return Q.allSettled(asyncCalls).then(final => {
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
            return findMany(model, objIds).then(objects => {
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
    return Q.nbind(model.find, model)({})
        .then(result => {
            return Utils.toObject(result);
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

    let queryObj = model.find(query, sel);
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
        .then(result => {
            // update embedded property, if any
            if (toLoadChilds != undefined && toLoadChilds == false) {
                return Utils.toObject(result);
            }

            var asyncCalls = [];
            Enumerable.from(result).forEach(x => {
                asyncCalls.push(mongooseHelper.embeddedChildren(model, x, false));
            });
            return Q.allSettled(asyncCalls).then(r => {
                return Enumerable.from(r).select(x => Utils.toObject(x.value)).toArray();
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
export function findOne(model: Mongoose.Model<any>, id, donotLoadChilds?: boolean) {
    console.log("findOne " + model.modelName);
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            return mongooseHelper.embeddedChildren(model, result, false, donotLoadChilds)
                .then(r => {
                    return Utils.toObject(r);
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
    return Q.nbind(model.findOne, model)(param)
        .then(result => {
            return mongooseHelper.embeddedChildren(model, result, false)
                .then(r => {
                    return Utils.toObject(r);
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
    return Q.nbind(model.find, model)({
        '_id': {
            $in: ids
        }
    }).then((result: any) => {
        if (result.length !== ids.length) {
            var error = 'findmany - numbers of items found:' + result.length + 'number of items searched: ' + ids.length;
            winstonLog.logError(`Error in findMany ${error}`);
            return Q.reject(error);
        }

        var asyncCalls = [];
        if (toLoadEmbeddedChilds) {
            Enumerable.from(result).forEach(x => {
                asyncCalls.push(mongooseHelper.embeddedChildren(model, x, false));
            });
            return Q.allSettled(asyncCalls).then(r => {
                return Enumerable.from(r).select(x => Utils.toObject(x.value)).toArray();
            });
        } else {
            return Utils.toObject(result);
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
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            var res = Utils.toObject(result)[prop];
            var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
            if (Enumerable.from(metas).any(x => x.propertyKey == prop)) {
                // create new object and add only that property for which we want to do eagerloading
                var result = {};
                result[prop] = res;
                return mongooseHelper.embeddedChildren(model, result, true)
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
    return mongooseHelper.addChildModelToParent(model, [clonedObj])
        .then(result => {
            try {
                mongooseHelper.autogenerateIdsForAutoFields(model, clonedObj);
                //Object.assign(obj, clonedObj);
            } catch (ex) {
                console.log(ex);
                return Q.reject(ex);
            }
            return Q.nbind(model.create, model)(new model(clonedObj)).then(result => {
                let resObj = Utils.toObject(result);
                Object.assign(obj, resObj);
                return obj;
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
    return Q.nbind(model.findByIdAndRemove, model)({ '_id': id })
        .then((response: any) => {
            return mongooseHelper.deleteCascade(model, [Utils.toObject(response)]).then(x => {
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

    return Q.nbind(model.find, model)({
        '_id': {
            $in: ids
        }
    }).then((results: Array<any>) => {
        var parents: Array<any> = Utils.toObject(results);
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