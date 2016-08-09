import Mongoose = require("mongoose");
import Q = require('q');
import {EntityChange} from '../core/enums/entity-change';
import {MetaUtils} from "../core/metadata/utils";
import * as CoreUtils from "../core/utils";
import * as Utils from "./utils";
import {Decorators} from '../core/constants/decorators';
import {DecoratorType} from '../core/enums/decorator-type';
import {MetaData} from '../core/metadata/metadata';
import {IAssociationParams} from '../core/decorators/interfaces';
import {IFieldParams, IDocumentParams} from './decorators/interfaces';
import {GetRepositoryForName} from '../core/dynamic/dynamic-repository';
import {getEntity, getModel} from '../core/dynamic/model-entity';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {winstonLog} from '../logging/winstonLog';

export function bulkPost(model: Mongoose.Model<any>, objArr: Array<any>): Q.Promise<any> {
    var addChildModel = [];

    // create all cloned models
    var clonedModels = [];
    Enumerable.from(objArr).forEach(obj => {
        var cloneObj = removeTransientProperties(model, obj);
        clonedModels.push(cloneObj);
        addChildModel.push(addChildModelToParent(model, cloneObj, null));
    });

    return Q.allSettled(addChildModel)
        .then(result => {
            // autogenerate ids of all the objects
            Enumerable.from(clonedModels).forEach(clonedObj => {
                try {
                    autogenerateIdsForAutoFields(model, clonedObj);
                    //Object.assign(obj, clonedObj);
                } catch (ex) {
                    winstonLog.logError(`Error in bulkPost ${ex}`);
                    return Q.reject(ex);
                }
            });

            return Q.nbind(model.create, model)(clonedModels).then(result => {
                return Enumerable.from(result).select(x => toObject(x)).toArray();
            })
                .catch(error => {
                    winstonLog.logError(`Error in bulkPost ${error}`);
                    console.log(error);
                })
        });
}

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

export function bulkPutMany(model: Mongoose.Model<any>, objIds: Array<any>, obj: any): Q.Promise<any> {
    let clonedObj = removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    var cond = {};
    cond['_id'] = {
        $in: objIds
    };
    var updatedProps = getUpdatedProps(clonedObj, 'put');
    return Q.nbind(model.update, model)(cond, updatedProps, { multi: true })
        .then(result => {
            return findMany(model, objIds).then(objects => {
                return updateParent(model, objects).then(res => {
                    return result;
                });
            });
        }).catch(error => {
            winstonLog.logError(`Error in put ${error}`);
            return Q.reject(error);
        });
}

function updateParent(model: Mongoose.Model<any>, objs: Array<any>) {
    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
    var asyncCalls = [];
    Enumerable.from(allReferencingEntities)
        .forEach((x: MetaData) => {
            var param = <IAssociationParams>x.params;
            if (param.embedded) {
                var meta = MetaUtils.getMetaData(x.target, Decorators.DOCUMENT);
                var targetModelMeta = meta[0];
                var repoName = (<IDocumentParams>targetModelMeta.params).name;
                var model = getModel(repoName);
                asyncCalls.push(updateParentDocument(model, x, objs));
            }
        });
    return Q.allSettled(asyncCalls);
}

function updateParentDocument(model: Mongoose.Model<any>, meta: MetaData, objs: Array<any>) {
    var queryCond = {};
    var ids = Enumerable.from(objs).select(x => x['_id']).toArray();
    queryCond[meta.propertyKey + '._id'] = { $in: ids };
    return Q.nbind(model.find, model)(queryCond)
        .then(result => {
            {
                var asyncCall = [];
                Enumerable.from(result).forEach(doc => {
                    var newUpdate = {};
                    var values = doc[meta.propertyKey];
                    if (meta.propertyType.isArray) {
                        var res = [];
                        values.forEach(x => {
                            var index = ids.indexOf(x['_id']);
                            if (index >= 0) {
                                res.push(objs[index]);
                            }
                            else {
                                res.push(x);
                            }
                        });
                        newUpdate[meta.propertyKey] = res;
                    }
                    else {
                        var index = ids.indexOf(values['_id']);
                        newUpdate[meta.propertyKey] = objs[index];
                    }
                    asyncCall.push(put(model, doc['_id'], newUpdate));
                });
                return Q.allSettled(asyncCall);
            }
        });
}

export function findAll(model: Mongoose.Model<any>): Q.Promise<any> {
    return Q.nbind(model.find, model)({})
        .then(result => {
            return toObject(result);
        }).catch(error => {
            winstonLog.logError(`Error in findAll ${error}`);
            return error;
        });
}

export function findWhere(model: Mongoose.Model<any>, query : any, sort? : any, skip? : number, limit? : number, select? : number): Q.Promise<any> {
    let queryObj = model.find(query);
    if(sort){
        queryObj = queryObj.sort(sort);
    }
    if(skip){
        queryObj = queryObj.skip(skip);
    }
    if(limit){
        queryObj = queryObj.limit(limit);
    }
    if(select){
        queryObj = queryObj.select(select);;
    }
    winstonLog.logInfo(`findWhere query is ${query}`);
    return Q.nbind(queryObj.exec, queryObj)()
        .then(result => {
            return toObject(result);
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

export function findOne(model: Mongoose.Model<any>, id) {
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            return embeddedChildren(model, result, false)
                .then(r => {
                    return toObject(r);
                });
        }).catch(error => {
            winstonLog.logError(`Error in findOne ${error}`);
            return error;
        });
}

export function findByField(model: Mongoose.Model<any>, fieldName, value): Q.Promise<any> {
    var param = {};
    param[fieldName] = value;
    return Q.nbind(model.findOne, model)(param)
        .then(result => {
            return toObject(result);
        },
        err => {
            winstonLog.logError(`Error in findByField ${err}`);
            return Q.reject(err);
        });
}

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
        return toObject(result);
    });
}

export function findChild(model: Mongoose.Model<any>, id, prop): Q.Promise<any> {
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            var res = toObject(result)[prop];
            var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
            if (Enumerable.from(metas).any(x => x.propertyKey == prop)) {
                // create new object and add only that property for which we want to do eagerloading
                var result = {};
                result[prop] = res;
                return embeddedChildren(model, result, true)
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
    let clonedObj = removeTransientProperties(model, obj);
    return addChildModelToParent(model, clonedObj, null)
        .then(result => {
            try {
                autogenerateIdsForAutoFields(model, clonedObj);
                //Object.assign(obj, clonedObj);
            } catch (ex) {
                console.log(ex);
                return Q.reject(ex);
            }
            return Q.nbind(model.create, model)(new model(clonedObj)).then(result => {
                let resObj = toObject(result);
                Object.assign(obj, resObj);
                return obj;
            });
        }).catch(error => {
            winstonLog.logError(`Error in post ${error}`);
            return Q.reject(error);
        });
}

export function del(model: Mongoose.Model<any>, id: any): Q.Promise<any> {
    return Q.nbind(model.findOneAndRemove, model)({ '_id': id })
        .then((response: any) => {
            return deleteCascade(model, toObject(response)).then(x => {
                return updateEmbeddedOnEntityChange(model, EntityChange.delete, response, null)
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

export function put(model: Mongoose.Model<any>, id: any, obj: any): Q.Promise<any> {
    let clonedObj = removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = getUpdatedProps(clonedObj, 'put');
        return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, updatedProps, { upsert: true, new: true })
            .then(result => {
                return updateEmbeddedOnEntityChange(model, EntityChange.put, result, getChangedProperties(clonedObj))
                    .then(res => {
                        let resObj = toObject(result);
                        Object.assign(obj, resObj);
                        return obj;
                    });
            });
    }).catch(error => {
        winstonLog.logError(`Error in put ${error}`);
        return Q.reject(error);
    });
}

export function patch(model: Mongoose.Model<any>, id: any, obj): Q.Promise<any> {
    let clonedObj = removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = getUpdatedProps(clonedObj, 'patch');
        return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, updatedProps, { new: true })
            .then(result => {
                return updateEmbeddedOnEntityChange(model, EntityChange.patch, result, getChangedProperties(clonedObj))
                    .then(res => {
                        let resObj = toObject(result);
                        Object.assign(obj, resObj);
                        return obj;
                    });
            });
    }).catch(error => {
        winstonLog.logError(`Error in patch ${error}`);
        return Q.reject(error);
    });
}

function deleteCascade(model: Mongoose.Model<any>, updateObj: any) {
    var relations = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    var relationToDelete = Enumerable.from(relations).where(x => x.params.deleteCascade).toArray();
    var ids = {};
    var models = {};

    relationToDelete.forEach(res => {
        var x = <IAssociationParams>res.params;
        var prop = updateObj[res.propertyKey];
        ids[x.rel] = ids[x.rel] || [];
        if (x.embedded) {
            if (res.propertyType.isArray) {
                var id = Enumerable.from(prop).select(x => x['_id']).toArray();
                ids[x.rel] = ids[x.rel].concat(id);
            }
            else {
                ids[x.rel] = ids[x.rel].concat([prop['_id']]);
            }
        }
        else {
            ids[x.rel] = ids[x.rel].concat(res.propertyType.isArray ? prop : [prop]);
        }
        ids[x.rel] = Enumerable.from(ids[x.rel]).select(x => x.toString()).toArray();
    });

    var asyncCalls = [];
    for (var i in ids) {
        if (ids[i].length > 0) {
            models[i] = getModel(i);
            asyncCalls.push(bulkDelete(models[i], ids[i]));
        }
    }

    return Q.allSettled(asyncCalls);
}

function bulkDelete(model: Mongoose.Model<any>, ids: any) {
    return findMany(model, ids).then(data => {
        return Q.nbind(model.remove, model)({
            '_id': {
                $in: ids
            }
        }).then(x => {
            var asyncCalls = [];
            // will not call update embedded parent because these children should not exist without parent
            Enumerable.from(data).forEach(res => {
                asyncCalls.push(deleteCascade(model, res));
            });

            return Q.allSettled(asyncCalls);
        });
    });
}

function patchAllEmbedded(model: Mongoose.Model<any>, prop: string, updateObj: any, entityChange: EntityChange, isEmbedded: boolean, isArray?: boolean): Q.Promise<any> {
    if (isEmbedded) {

        var queryCond = {};
        queryCond[prop + '._id'] = updateObj['_id'];

        if (entityChange === EntityChange.put
            || entityChange === EntityChange.patch
            || (entityChange === EntityChange.delete && !isArray)) {

            var cond = {};
            cond[prop + '._id'] = updateObj['_id'];

            var newUpdateObj = {};
            isArray
                ? newUpdateObj[prop + '.$'] = updateObj
                : newUpdateObj[prop] = entityChange === EntityChange.delete ? null : updateObj;

            return Q.nbind(model.update, model)(cond, { $set: newUpdateObj }, { multi: true })
                .then(result => {
                    return updateEmbeddedParent(model, queryCond, result, prop);
                }).catch(error => {
                    winstonLog.logError(`Error in patchAllEmbedded ${error}`);
                    return Q.reject(error);
                });

        }
        else {
            var pullObj = {};
            pullObj[prop] = {};
            pullObj[prop]['_id'] = updateObj['_id'];

            return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                .then(result => {
                    return updateEmbeddedParent(model, queryCond, result, prop);
                }).catch(error => {
                    winstonLog.logError(`Error in patchAllEmbedded ${error}`);
                    return Q.reject(error);
                });
        }
    }
    else {
        // this to handle foreign key deletion only
        if (entityChange == EntityChange.delete) {
            var queryCond = {};
            if (isArray) {
                queryCond[prop] = { $in: [updateObj['_id']] };
            }
            else {
                queryCond[prop] = updateObj['_id'];
            }

            var pullObj = {};
            pullObj[prop] = {};

            if (isArray) {
                pullObj[prop] = updateObj['_id'];
                return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                    .then(result => {
                        return updateEmbeddedParent(model, queryCond, result, prop);
                    }).catch(error => {
                        winstonLog.logError(`Error in patchAllEmbedded ${error}`);
                        return Q.reject(error);
                    });
            }
            else {
                pullObj[prop] = null;
                var cond = {};
                cond[prop] = updateObj['_id'];

                return Q.nbind(model.update, model)(cond, { $set: pullObj }, { multi: true })
                    .then(result => {
                        //console.log(result);
                        return updateEmbeddedParent(model, queryCond, result, prop);
                    }).catch(error => {
                        winstonLog.logError(`Error in patchAllEmbedded ${error}`);
                        return Q.reject(error);
                    });
            }
        }
    }
}

function updateEmbeddedParent(model: Mongoose.Model<any>, queryCond, result, property: string) {
    if (result['nModified'] == 0)
        return;

    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));

    var first = Enumerable.from(allReferencingEntities).where(x => (<IAssociationParams>x.params).embedded).firstOrDefault();
    if (!first)
        return;

    winstonLog.logInfo(`updateEmbeddedParent query is ${queryCond}`);
    // find the objects and then update these objects
    return Q.nbind(model.find, model)(queryCond)
        .then(updated => {

            // Now update affected documents in embedded records
            var asyncCalls = [];
            Enumerable.from(updated).forEach(x => {
                asyncCalls.push(updateEmbeddedOnEntityChange(model, EntityChange.patch, x, [property]));
            });
            return Q.all(asyncCalls);

        }).catch(error => {
            winstonLog.logError(`Error in updateEmbeddedParent ${error}`);
            return Q.reject(error);
        });
}

function getUpdatedProps(obj: any, type: any) {
    var push = {};
    var set = {};
    var unset = {};
    var s = false, u = false, p = false;
    for (var i in obj) {
        if (obj[i] == undefined || obj[i] == null || obj[i] == undefined && obj[i] == '' || (obj[i] instanceof Array && obj[i] == []) || obj[i] == {}) {
            unset[i] = obj[i];
            u = true;
        }
        else {
            if (type == 'patch' && obj[i] instanceof Array) {
                push[i] = {
                    $each: obj[i]
                }
                p = true;
            }
            else {
                set[i] = obj[i];
                s = true;
            }
        }
    }

    var json = {};
    if (s) {
        json['$set'] = set;
    }
    if (u) {
        json['$unset'] = unset;
    }
    if (p) {
        json['$push'] = push;
    }

    return json;
}

function removeTransientProperties(model: Mongoose.Model<any>, obj: any): any {
    var clonedObj = {};
    Object.assign(clonedObj, obj);
    var transientProps = Enumerable.from(MetaUtils.getMetaData(getEntity(model.modelName))).where((ele: MetaData, idx) => {
        if (ele.decorator === Decorators.TRANSIENT) {
            return true;
        }
        return false;
    }).forEach(element => {
        delete clonedObj[element.propertyKey];
    });
    return clonedObj;
}

function embeddedChildren(model: Mongoose.Model<any>, val: any, force: boolean) {
    if (!model)
        return;

    var asyncCalls = [];
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        if (param.embedded)
            return;

        if (force || param.eagerLoading){
            var relModel = getModel(param.rel);
            if (m.propertyType.isArray) {
                if (val[m.propertyKey] && val[m.propertyKey].length > 0) {
                    asyncCalls.push(findMany(relModel, val[m.propertyKey])
                        .then(result => {
                            var childCalls = [];
                            var updatedChild = [];
                            Enumerable.from(result).forEach(res => {
                                childCalls.push(embeddedChildren(relModel, res, false).then(r => {
                                    updatedChild.push(r);
                                }));
                            });
                            return Q.all(childCalls).then(r => {
                                val[m.propertyKey] = updatedChild;
                            });
                        }));
                }
            }
            else {
                if (val[m.propertyKey]) {
                    asyncCalls.push(findOne(relModel, val[m.propertyKey])
                        .then(result => {
                            return Q.resolve(embeddedChildren(relModel, result, false).then(r => {
                                val[m.propertyKey] = r;
                            }));
                        }).catch(error => {
                            winstonLog.logError(`Error in embeddedChildren ${error}`);
                            return Q.reject(error);
                        }));
                }
            }
        }
    });

    if (asyncCalls.length == 0)
        return Q.when(val);

    return Q.allSettled(asyncCalls).then(res => {
        return val;
    });
}

function isDataValid(model: Mongoose.Model<any>, val: any, id: any) {
    var asyncCalls = [];
    var ret: boolean = true;
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        if (val[m.propertyKey]) {
            asyncCalls.push(isRelationPropertyValid(model, m, val[m.propertyKey], id).then(res => {
                if (res != undefined && !res) {
                    ret = false;
                }
            }));
        }
    });
    return Q.all(asyncCalls).then(f => {
        if (!ret) {
            winstonLog.logError('Invalid value. Adding these properties will break the relation.');
            throw 'Invalid value. Adding these properties will break the relation.'
        }
    });
}

function isRelationPropertyValid(model: Mongoose.Model<any>, metadata: MetaData, val: any, id: any) {
    switch (metadata.decorator) {
        case Decorators.ONETOMANY: // for array of objects
            if (metadata.propertyType.isArray) {
                if (Array.isArray(val) && val.length > 0) {
                    var queryCond = [];
                    var params = <IAssociationParams>metadata.params;
                    Enumerable.from(val).forEach(x => {
                        var con = {};
                        if (params.embedded) {
                            con[metadata.propertyKey + '._id'] = x['_id'];
                        }
                        else {
                            con[metadata.propertyKey] = { $in: [x] };
                        }
                        queryCond.push(con);
                    });
                    return Q.nbind(model.find, model)(getQueryCondition(id, queryCond))
                        .then(result => {
                            if (Array.isArray(result) && result.length > 0)
                                return false;
                            else
                                return true;
                        }).catch(error => {
                            winstonLog.logError(`Error in isRelationPropertyValid ${error}`);
                            return Q.reject(error);
                        });
                }
            }
            break;
        case Decorators.ONETOONE: // for single object
            if (!metadata.propertyType.isArray) {
                if (!Array.isArray(val)) {
                    var queryCond = [];
                    var con = {};
                    var params = <IAssociationParams>metadata.params;
                    if (params.embedded) {
                        con[metadata.propertyKey + '._id'] = val['_id'];
                    }
                    else {
                        con[metadata.propertyKey] = { $in: [val] };
                    }
                    queryCond.push(con);

                    return Q.nbind(model.find, model)(getQueryCondition(id, queryCond))
                        .then(result => {
                            if (Array.isArray(result) && result.length > 0) {
                                return false;
                            }
                        }).catch(error => {
                            winstonLog.logError(`Error in isRelationPropertyValid ${error}`);
                            return Q.reject(error);
                        });
                }
            }
            break;
        case Decorators.MANYTOONE: // for single object
            // do nothing
            return Q.when(true);
        case Decorators.MANYTOMANY: // for array of objects
            // do nothing
            return Q.when(true);
    }
    return Q.when(true);
}

function getQueryCondition(id: any, cond: any): any {
    if (id) {
        return {
            $and: [
                { $or: cond },
                { '_id': { $ne: id } }
            ]
        };
    }
    else {
        return { $or: cond }
    }
}

/**
 * Autogenerate mongodb guid (ObjectId) for the autogenerated fields in the object
 * @param obj
 * throws TypeError if field type is not String, ObjectId or Object
 */
function autogenerateIdsForAutoFields(model: Mongoose.Model<any>, obj: any): void {
    var fieldMetaArr = MetaUtils.getMetaData(getEntity(model.modelName), Decorators.FIELD);
    if (!fieldMetaArr) {
        return;
    }
    Enumerable.from(fieldMetaArr)
        .where((keyVal) => keyVal && keyVal.params && (<IFieldParams>keyVal.params).autogenerated)
        .forEach((keyVal) => {
            var metaData = <MetaData>keyVal;
            var objectId = new Mongoose.Types.ObjectId();
            if (metaData.getType() === String) {
                obj[metaData.propertyKey] = objectId.toHexString();
            } else if (metaData.getType() === Mongoose.Types.ObjectId || metaData.getType() === Object) {
                obj[metaData.propertyKey] = objectId;
            } else {
                winstonLog.logError(model.modelName + ': ' + metaData.propertyKey + ' - ' + 'Invalid autogenerated type');
                throw TypeError(model.modelName + ': ' + metaData.propertyKey + ' - ' + 'Invalid autogenerated type');
            }
        });
}

function updateEmbeddedOnEntityChange(model: Mongoose.Model<any>, entityChange: EntityChange, obj: any, changedProps: Array<string>) {
    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
    var asyncCalls = [];
    Enumerable.from(allReferencingEntities)
        .forEach((x: MetaData) => {
            var param = <IAssociationParams>x.params;
            if (entityChange == EntityChange.delete || isPropertyUpdateRequired(changedProps, param.properties)) {
                var newObj = getFilteredValue(obj, param.properties);
                asyncCalls.push(updateEntity(x.target, x.propertyKey, x.propertyType.isArray, newObj, param.embedded, entityChange));
            }
        });
    return Q.allSettled(asyncCalls);
}

function updateEntity(targetModel: Object, propKey: string, targetPropArray: boolean, updatedObject: any, embedded: boolean, entityChange: EntityChange): Q.Promise<any> {
    var meta = MetaUtils.getMetaData(targetModel, Decorators.DOCUMENT);

    if (!meta) {
        throw 'Could not fetch metadata for target object';
    }

    var targetModelMeta = meta[0];
    var repoName = (<IDocumentParams>targetModelMeta.params).name;
    var model = getModel(repoName);
    if (!model) {
        winstonLog.logError('no repository found for relation');
        throw 'no repository found for relation';
    }
    return patchAllEmbedded(model, propKey, updatedObject, entityChange, embedded, targetPropArray);
}

/**
 * Add child model only if relational property have set embedded to true
 * @param model
 * @param obj
 */
function addChildModelToParent(model: Mongoose.Model<any>, obj: any, id: any) {
    var asyncCalls = [];
    var metaArr = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    for (var m in metaArr) {
        var meta: MetaData = <any>metaArr[m];
        if (obj[meta.propertyKey]) {
            asyncCalls.push(embedChild(obj, meta.propertyKey, meta));
        }
    }
    if (asyncCalls.length == 0) {
        return isDataValid(model, obj, id);
    }
    else {
        return Q.all(asyncCalls).then(x => {
            return isDataValid(model, obj, id);
        });
    }
}

function embedChild(obj, prop, relMetadata: MetaData): Q.Promise<any> {
    if (!obj[prop])
        return;

    if (relMetadata.propertyType.isArray && !(obj[prop] instanceof Array)) {
        winstonLog.logError('Expected array, found non-array');
        throw 'Expected array, found non-array';
    }
    if (!relMetadata.propertyType.isArray && (obj[prop] instanceof Array)) {
        winstonLog.logError('Expected single item, found array');
        throw 'Expected single item, found array';
    }

    var createNewObj = [];
    var params: IAssociationParams = <any>relMetadata.params;
    var relModel = getModel(params.rel);
    var val = obj[prop];
    var newVal = val;
    var prom: Q.Promise<any> = null;

    if (relMetadata.propertyType.isArray) {
        newVal = [];
        var objs = [];
        for (var i in val) {
            if (CoreUtils.isJSON(val[i])) {
                if (val[i]['_id']) {
                    newVal.push(val[i]['_id']);
                }
                else {
                    objs.push(val[i]);
                }
            }
            else {
                newVal.push(val[i]);
            }
        }
        if (objs.length > 0) {
            prom = bulkPost(relModel, objs);
        } else {
            obj[prop] = newVal;
        }
    }
    else {
        if (CoreUtils.isJSON(val)) {
            if (val['_id']) {
                obj[prop] = val['_id'];
            }
            else {
                prom = post(relModel, val);
            }
        }
    }

    if (prom) {
        return prom.then(x => {
            if (x) {
                if (x instanceof Array) {
                    x.forEach(v => {
                        newVal.push(v['_id']);
                    });
                }
                else {
                    newVal = x['_id'];
                }
                obj[prop] = newVal;
            }
            return fetchAndUpdateChildren(relModel, relMetadata, obj, prop);

        });
    }
    else {
        return fetchAndUpdateChildren(relModel, relMetadata, obj, prop);
    }
}

function fetchAndUpdateChildren(relModel, relMetadata, obj, prop) {
    var params: IAssociationParams = <any>relMetadata.params;
    return findMany(relModel, castAndGetPrimaryKeys(obj, prop, relMetadata))
        .then(result => {
            if (result && result.length > 0) {
                if (params.embedded) {
                    obj[prop] = obj[prop] instanceof Array ? getFilteredValues(result, params.properties) : getFilteredValue(result[0], params.properties);
                }
                else {
                    // Verified that foriegn keys are correct and now update the Id
                    obj[prop] = obj[prop] instanceof Array ? Enumerable.from(result).select(x => x['_id']).toArray() : result[0]['_id'];
                }
            }
        }).catch(error => {
            winstonLog.logError(`Error: ${error}`);
            return Q.reject(error);
        });
}

function getChangedProperties(changedObj: any): Array<string> {
    return Enumerable.from(changedObj).select(x => x.key).toArray();
}

function isPropertyUpdateRequired(changedProps: Array<string>, properties: [string]) {
    if (properties && properties.length > 0) {
        if (Enumerable.from(properties).any(x => changedProps.indexOf(x) > -1))
            return true;
    }

    if (!changedProps || changedProps.length == 0)
        return false;
    else if (!properties || properties.length == 0)
        return true;
    else {
        if (Enumerable.from(properties).any(x => changedProps.indexOf(x) > -1))
            return true;
        else
            return false;
    }
}

function getFilteredValues(values: [any], properties: [string]) {
    var result = [];
    values.forEach(x => {
        result.push(getFilteredValue(x, properties));
    });
    return result;
}

function getFilteredValue(value, properties: [string]) {
    if (properties && properties.length > 0) {
        var json = {};
        properties.forEach(x => {
            if (value[x])
                json[x] = value[x];
        });

        if (JSON.stringify(json) == '{}') {
            return null;
        }
        else if (value['_id']) {
            json['_id'] = value['_id'];
        }
        return json;
    }
    else {
        return value;
    }
}

function castAndGetPrimaryKeys(obj, prop, relMetaData: MetaData): Array<any> {
    var primaryMetaDataForRelation = CoreUtils.getPrimaryKeyMetadata(relMetaData.target);

    if (!primaryMetaDataForRelation) {
        winstonLog.logError('primary key not found for relation');
        throw 'primary key not found for relation';
    }

    var primaryType = primaryMetaDataForRelation.getType();
    return obj[prop] instanceof Array
        ? Enumerable.from(obj[prop]).select(x => Utils.castToMongooseType(x, primaryType)).toArray()
        : [Utils.castToMongooseType(obj[prop], primaryType)];
}

function toObject(result): any {
    if (result instanceof Array) {
        return Enumerable.from(result).select(x => x.toObject()).toArray();
    }
    return result ? result.toObject() : null;
}
