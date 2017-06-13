import Mongoose = require("mongoose");
import Q = require('q');
import { EntityChange } from '../core/enums/entity-change';
import { getEntity } from '../core/dynamic/model-entity';
import * as Enumerable from 'linq';
import { winstonLog } from '../logging/winstonLog';
import * as mongooseHelper from './mongoose-model-helper';
import * as CoreUtils from "../core/utils";
import * as Utils from './utils';
import {QueryOptions} from '../core/interfaces/queryOptions';
import {MetaUtils} from "../core/metadata/utils";
import {Decorators} from '../core/constants/decorators';
import {GetRepositoryForName} from '../core/dynamic/dynamic-repository';

/**
 * Iterate through objArr and check if any child object need to be added. If yes, then add those child objects.
 * Bulk create these updated objects.
 * Usage - Post multiple objects parallely
 * @param model
 * @param objArr
 */
export function bulkPost(model: Mongoose.Model<any>, objArr: Array<any>): Q.Promise<any> {
    var addChildModel = [];

    // create all cloned models
    var clonedModels = [];
    Enumerable.from(objArr).forEach(obj => {
        var cloneObj = mongooseHelper.removeTransientProperties(model, obj);
        clonedModels.push(cloneObj);
        addChildModel.push(mongooseHelper.addChildModelToParent(model, cloneObj, null));
    });

    return Q.allSettled(addChildModel)
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

            return Q.nbind(model.create, model)(clonedModels).then(result => {
                return Enumerable.from(result).select(x => Utils.toObject(x)).toArray();
            })
                .catch(error => {
                    winstonLog.logError(`Error in bulkPost ${error}`);
                    return Q.reject(error);
                })
        });
}

/**
 * Iterate through objArr and call put for these
 * Usage - Update multiple object sequentially
 * @param model
 * @param objArr
 */
export function bulkPut(model: Mongoose.Model<any>, objArr: Array<any>): Q.Promise<any> {
    var asyncCalls = [];

    Enumerable.from(objArr).forEach(x => {
        if (x['_id']) {
            asyncCalls.push(put(model, x['_id'], x));
        }
    });

    return Q.allSettled(asyncCalls)
        .then(result => {
            return Enumerable.from(result).select(x => x.value).toArray();
        })
        .catch(error => {
            winstonLog.logError(`Error in bulkPut ${error}`);
            return Q.reject(error);
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
                    return result;
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
export function findOne(model: Mongoose.Model<any>, id) {
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            return mongooseHelper.embeddedChildren(model, result, false)
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
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    return mongooseHelper.addChildModelToParent(model, clonedObj, null)
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
    return Q.nbind(model.findOneAndRemove, model)({ '_id': id })
        .then((response: any) => {
            return mongooseHelper.deleteCascade(model, Utils.toObject(response)).then(x => {
                return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.delete, response, null)
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
    ids.forEach(x => {
        asyncCalls.push(del(model, x));
    });

    return Q.allSettled(asyncCalls)
        .then(result => {
            var ret = [];
            Enumerable.from(result).forEach(x => {
                if (x.value) ret.push(x.value);
                if (x.reason) ret.push(x.reason);
            });
            return ret;
        })
        .catch(err => {
            winstonLog.logError(`bulkDel failed ${err}`);
            return Q.reject('bulkDel failed');
        });
}

/**
 * Check whether decorator is applied or not.
 * @param path
 * @param decorator
 * @param propertyKey
 */
function isDecoratorApplied(path: any, decorator: string, propertyKey: string) {
    var isDecoratorPresent: boolean = false;
    let repo = GetRepositoryForName(path);
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
export function put(model: Mongoose.Model<any>, id: any, obj: any, path?: string): Q.Promise<any> {
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return mongooseHelper.addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.put);
        let isDecoratorPresent = isDecoratorApplied(path, Decorators.OPTIMISTICLOCK, "put");
        let query: Object = { '_id': id };
        if (isDecoratorPresent === true) {
            updatedProps["$set"] && delete updatedProps["$set"]["__v"];
            updatedProps["$inc"] = { '__v': 1 };
            query["__v"] = obj["__v"];
        }
        return Q.nbind(model.findOneAndUpdate, model)(query, updatedProps, { new: true })
            .then(result => {
                if (!result && isDecoratorPresent === true) {
                    return Q.reject("You are trying to update with stale data,please try again after some time.");
                }
                return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.put, result, Utils.getPropertiesFromObject(clonedObj))
                    .then(res => {
                        var resObj = Utils.toObject(result);
                        return mongooseHelper.fetchEagerLoadingProperties(model, resObj).then(r => {
                            Object.assign(obj, r);
                            return obj;
                        });
                    });
            }).catch(error => {
                winstonLog.logError(`Error in put ${error}`);
                return Q.reject(error);
            });
    }).catch(error => {
        winstonLog.logError(`Error in put ${error}`);
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
export function patch(model: Mongoose.Model<any>, id: any, obj, path?: string): Q.Promise<any> {
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    
    // First update the any embedded property and then update the model
    return mongooseHelper.addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.patch);
        let isDecoratorPresent = isDecoratorApplied(path, Decorators.OPTIMISTICLOCK, "patch");
        let query: Object = { '_id': id };
        if (isDecoratorPresent === true) {
            updatedProps["$set"] && delete updatedProps["$set"]["__v"];
            updatedProps["$push"] && delete updatedProps["$push"]["__v"];
            updatedProps["$inc"] = { '__v': 1 };
            if(obj["__v"]){
              query["__v"] = obj["__v"];
            }
        }
        return Q.nbind(model.findOneAndUpdate, model)(query, updatedProps, { new: true })
            .then(result => {
                if (!result && isDecoratorPresent === true) {
                    return Q.reject("You are trying to update with stale data,please try again after some time.");
                }
                return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.patch, result, Utils.getPropertiesFromObject(clonedObj))
                    .then(res => {
                        var resObj = Utils.toObject(result);
                        return mongooseHelper.fetchEagerLoadingProperties(model, resObj).then(r => {
                            Object.assign(obj, r);
                            return obj;
                        });
                    });
            });
    }).catch(error => {
        winstonLog.logError(`Error in patch ${error}`);
        return Q.reject(error);
    });
}