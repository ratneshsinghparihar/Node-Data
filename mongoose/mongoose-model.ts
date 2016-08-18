import Mongoose = require("mongoose");
import Q = require('q');
import {EntityChange} from '../core/enums/entity-change';
import {getEntity} from '../core/dynamic/model-entity';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {winstonLog} from '../logging/winstonLog';
import * as mongooseHelper from './mongoose-model-helper';
import * as CoreUtils from "../core/utils";
import * as Utils from './utils';

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
                    console.log(error);
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
            return error;
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
            return error;
        });
}

/**
 * Query collection and then populate child objects with relationship
 * Usage - Search object with given condition
 * @param model
 * @param query
 * @param select
 * @param sort
 * @param skip
 * @param limit
 */
export function findWhere(model: Mongoose.Model<any>, query: any, select?: Array<string>, sort?: any, skip?: number, limit?: number): Q.Promise<any> {
    var sel = {};
    if (select) {
        select.forEach(x => {
            sel[x] = 1;
        });
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
    winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then(result => {
            // update embedded property, if any
            var asyncCalls = [];
            Enumerable.from(result).forEach(x => {
                asyncCalls.push(mongooseHelper.embeddedChildren(model, result, false));
            });
            return Q.allSettled(asyncCalls).then(r => {
                return Enumerable.from(r).select(x => x.value).toArray();
            });
        }).catch(error => {
            winstonLog.logError(`Error in findWhere ${error}`);
            return error;
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
            return error;
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
export function findMany(model: Mongoose.Model<any>, ids: Array<any>) {
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
        return Utils.toObject(result);
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
            return error;
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
            return Q.reject('delete failed');
        });
}

/**
 * Sequetially delete the objects
 * @param modelte
 * @param ids
 */
export function bulkDel(model: Mongoose.Model<any>, ids: Array<any>): Q.Promise<any> {
    var asyncCalls = [];
    ids.forEach(x => {
        asyncCalls.push(del(model, x));
    });

    return Q.allSettled(asyncCalls)
        .then(result => {
            return Enumerable.from(result).select(x => x.value).toArray();
        })
        .catch(err => {
            winstonLog.logError(`bulkDel failed ${err}`);
            return Q.reject('bulkDel failed');
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
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return mongooseHelper.addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.put);
        return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, updatedProps, { upsert: true, new: true })
            .then(result => {
                return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.put, result, Utils.getPropertiesFromObject(clonedObj))
                    .then(res => {
                        let resObj = Utils.toObject(result);
                        Object.assign(obj, resObj);
                        return obj;
                    });
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
export function patch(model: Mongoose.Model<any>, id: any, obj): Q.Promise<any> {
    let clonedObj = mongooseHelper.removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return mongooseHelper.addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = Utils.getUpdatedProps(clonedObj, EntityChange.patch);
        return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, updatedProps, { new: true })
            .then(result => {
                return mongooseHelper.updateEmbeddedOnEntityChange(model, EntityChange.patch, result, Utils.getPropertiesFromObject(clonedObj))
                    .then(res => {
                        let resObj = Utils.toObject(result);
                        Object.assign(obj, resObj);
                        return obj;
                    });
            });
    }).catch(error => {
        winstonLog.logError(`Error in patch ${error}`);
        return Q.reject(error);
    });
}