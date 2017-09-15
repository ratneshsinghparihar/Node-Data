import Mongoose = require("mongoose");
import Q = require('q');
import { EntityChange } from '../core/enums/entity-change';
import { MetaUtils } from "../core/metadata/utils";
import * as CoreUtils from "../core/utils";
import * as Utils from "./utils";
import { Decorators } from '../core/constants/decorators';
import { DecoratorType } from '../core/enums/decorator-type';
import { MetaData } from '../core/metadata/metadata';
import { IAssociationParams } from '../core/decorators/interfaces';
import { IFieldParams, IDocumentParams } from './decorators/interfaces';
import { GetRepositoryForName, DynamicRepository } from '../core/dynamic/dynamic-repository';
import { getEntity, getModel, repoFromModel } from '../core/dynamic/model-entity';
import * as Enumerable from 'linq';
import { winstonLog } from '../logging/winstonLog';
import * as mongooseModel from './mongoose-model';
import {PrincipalContext} from '../security/auth/principalContext';

/**
 * finds all the parent and update them. It is called when bulk objects are updated
 * @param model
 * @param objs
 */
export function updateParent(model: Mongoose.Model<any>, objs: Array<any>) {
    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
    var asyncCalls = [];
    Enumerable.from(allReferencingEntities)
        .forEach((x: MetaData) => {
            var param = <IAssociationParams>x.params;
            if (param.embedded) {
                var meta = MetaUtils.getMetaData(x.target, Decorators.DOCUMENT);
                var targetModelMeta = meta[0];
                var repoName = (<IDocumentParams>targetModelMeta.params).name;
                var model = Utils.getCurrentDBModel(repoName);
                asyncCalls.push(updateParentDocument(model, x, objs));
            }
        });
    return Q.allSettled(asyncCalls);
}

/**
 * This removes all the transient properties.
 * @param model
 * @param obj
 */
export function removeTransientProperties(model: Mongoose.Model<any>, obj: any): any {
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

export function embeddedChildren1(model: Mongoose.Model<any>, values: Array<any>, force: boolean, toLoadChildren?: boolean) {
    if (!model)
        return;

    var asyncCalls = [];
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        //if (param.embedded)
        //    return;

        if (force || param.embedded || (param.eagerLoading && toLoadChildren)) {
            var relModel = Utils.getCurrentDBModel(param.rel);
            // find model repo and findMany from repo instead of calling mongoose model directly
            let repo: DynamicRepository = repoFromModel[relModel.modelName];
            var ids = [];
            values.forEach(val => {
                if (!val[m.propertyKey])
                    return;

                if (m.propertyType.isArray) {
                    ids = ids.concat(val[m.propertyKey]);
                }
                else {
                    ids.push(val[m.propertyKey]);
                }
            });
            if (ids.length == 0)
                return;
            asyncCalls.push(repo.findMany(ids).then((result: Array<any>) => {
                let res = {}
                result.forEach(x => res[x._id] = x);
                values.forEach(val => {
                    if (!val[m.propertyKey])
                        return;

                    if (m.propertyType.isArray) {
                        var newVal = [];
                        if (param.embedded) {
                            // select only those objects which have been returned
                            //newVal = Enumerable.from(val[m.propertyKey]).where((x:any) => res[x._id]).toArray();
                            val[m.propertyKey].forEach(x => {
                                if (res[x._id]) {
                                    newVal.push(res[x._id]);
                                }
                            });
                        }
                        else {
                            val[m.propertyKey].forEach(x => {
                                if (res[x]) {
                                    newVal.push(res[x]);
                                }
                            });
                        }
                        val[m.propertyKey] = newVal;
                    }
                    else {
                        val[m.propertyKey] = param.embedded ? res[val[m.propertyKey]._id] : res[val[m.propertyKey]];
                    }
                });
            }));
        }
    });

    if (asyncCalls.length == 0)
        return Q.when(values);

    return Q.allSettled(asyncCalls).then(res => {
        return values;
    });
}

/**
 * For eagerLoading, finds all the children and add this to the parent object.
 * This function is then recursively called to update all the embedded children.
 * @param model
 * @param val
 * @param force
 */
export function embeddedChildren(model: Mongoose.Model<any>, val: any, force: boolean, donotLoadChilds?: boolean) {
    if (!model)
        return;

    if (donotLoadChilds) {
        return Q.when(val);
    }

    var asyncCalls = [];
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        //if (param.embedded)
        //    return;

        if (force || param.eagerLoading || param.embedded) {
            var relModel = Utils.getCurrentDBModel(param.rel);
            // find model repo and findMany from repo instead of calling mongoose model directly
            let repo: DynamicRepository = repoFromModel[relModel.modelName];
            if (m.propertyType.isArray) {
                if (val[m.propertyKey] && val[m.propertyKey].length > 0) {
                    asyncCalls.push(repo.findMany(val[m.propertyKey])
                        .then(result => {
                            //var childCalls = [];
                            //var updatedChild = [];
                            //Enumerable.from(result).forEach(res => {
                            //    childCalls.push(embeddedChildren(relModel, res, false).then(r => {
                            //        updatedChild.push(r);
                            //    }));
                            //});
                            //return Q.all(childCalls).then(r => {
                            //    val[m.propertyKey] = updatedChild;
                            //});
                            val[m.propertyKey] = result;
                            return Q.when(val[m.propertyKey]);
                        }));
                }
            }
            else {
                if (val[m.propertyKey]) {
                    asyncCalls.push(repo.findOne(val[m.propertyKey], true)
                        .then(result => {
                            //return Q.resolve(embeddedChildren(relModel, result, false).then(r => {
                            //    val[m.propertyKey] = r;
                            //}));
                            val[m.propertyKey] = result;
                            return Q.when(val[m.propertyKey]);
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

/**
 * It find all children with deleteCascade = true, and delete those children.
 * Recursively, it finds all the relation with deleteCascade = true and delete them.
 * On deleting these objects, it will not update other parent doc because it is expected that these objects should not have any other parent.
 * @param model
 * @param updateObj
 */
export function deleteCascade(model: Mongoose.Model<any>, updateObj: Array<any>) {
    var relations = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    var relationToDelete = Enumerable.from(relations).where(x => x.params.deleteCascade).toArray();
    var ids = {};
    var models = {};

    relationToDelete.forEach(res => {
        var x = <IAssociationParams>res.params;
        var props = [];
        for (let i = 0; i < updateObj.length; i++) {
            if (updateObj[i] && updateObj[i][res.propertyKey]) {
                props.push(updateObj[i][res.propertyKey]);
            }
        }
        if (!props || !props.length)
            return;
        ids[x.rel] = ids[x.rel] || [];
        if (x.embedded) {
            if (res.propertyType.isArray) {
                let listOfAllSameObjects = props.reduce((prev, current) => {
                    return prev.concat(current);
                })  //Enumerable.from(prop).select(x => x['_id']).toArray();
                let listOfIds = listOfAllSameObjects.map(x => x._id);
                ids[x.rel] = ids[x.rel].concat(listOfIds);
            }
            else {
                let listOfIds = props.map(x => x._id);
                ids[x.rel] = ids[x.rel].concat(listOfIds);
            }
        }
        else {
            if (res.propertyType.isArray) {
                let listOfAllSameIds = props.reduce((prev, current) => {
                    return prev.concat(current);
                })  //Enumerable.from(prop).select(x => x['_id']).toArray();
                ids[x.rel] = ids[x.rel].concat(listOfAllSameIds);
            }
            else {
                ids[x.rel] = ids[x.rel].concat(props);
            }
        }
        ids[x.rel] = Enumerable.from(ids[x.rel]).select(x => x.toString()).toArray();
    });

    var asyncCalls = [];
    for (var i in ids) {
        if (ids[i].length > 0) {
            models[i] = Utils.getCurrentDBModel(i);
            asyncCalls.push(bulkDelete(models[i], ids[i]));
        }
    }

    return Q.allSettled(asyncCalls);
}

/**
 * Autogenerate mongodb guid (ObjectId) for the autogenerated fields in the object
 * @param obj
 * throws TypeError if field type is not String, ObjectId or Object
 */
export function autogenerateIdsForAutoFields(model: Mongoose.Model<any>, obj: any): void {
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

/**
 * It find all the parent document and then update them. This updation will only happen if that property have chaged
 * @param model
 * @param entityChange
 * @param obj
 * @param changedProps
 */
export function deleteEmbeddedFromParent(model: Mongoose.Model<any>, entityChange: EntityChange, obj: Array<any>) {
    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
    var asyncCalls = [];
    Enumerable.from(allReferencingEntities)
        .forEach((x: MetaData) => {
            var param = <IAssociationParams>x.params;
            if (entityChange == EntityChange.delete) {
                //var newObj = getFilteredValue(obj, param.properties);
                asyncCalls.push(updateEntity(x.target, x.propertyKey, x.propertyType.isArray, obj, param.embedded, entityChange, model));
            }
        });
    return Q.allSettled(asyncCalls);
}

/**
 * Add child model only if relational property have set embedded to true
 * @param model
 * @param obj
 */
export function addChildModelToParent(model: Mongoose.Model<any>, objects: Array<any>) {
    var asyncCalls = [];
    var metaArr = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    for (var m in metaArr) {
        var meta: MetaData = <any>metaArr[m];
        asyncCalls.push(embedChild(objects, meta.propertyKey, meta, model.modelName));
    }

    return Q.allSettled(asyncCalls).then(x => {
        return objects;
        //return isDataValid(model, obj, id).then(x => {
        //    return obj;
        //});
    });
}

export function updateWriteCount() {
    if (PrincipalContext) {
        var count = PrincipalContext.get('write');
        PrincipalContext.save('write', ++count);
    }

}

/**
 * current implemnetation only update embeded for one level parent-child relationship
 * e.g- only supports teacher and student relation ship not principle->teacher->student embeded object  
 * @param model
 * @param meta
 * @param objs
 */
function updateParentDocument(model: Mongoose.Model<any>, meta: MetaData, objs: Array<any>) {
    var queryCond = {};
    var ids = Enumerable.from(objs).select(x => x['_id']).toArray();
    queryCond[meta.propertyKey + '._id'] = { $in: ids };
    console.log("updateParentDocument " + model.modelName + " count " + ids.length);
    updateWriteCount();
    return Q.nbind(model.find, model)(queryCond, { '_id': 1 }).then((result: Array<any>) => {
        if (!result) {
            return Q.resolve([]);
        }
        if (result && !result.length) {
            return Q.resolve(result);
        }
        var parents: Array<any> = Utils.toObject(result);
        var parentIds = parents.map(x => x._id);
        var bulk = model.collection.initializeUnorderedBulkOp();
        // classic for loop used gives high performanance
        for (var i = 0; i < objs.length; i++) {
            var queryFindCond = {};
            var updateSet = {};
            var objectId = Utils.castToMongooseType(objs[i]._id, Mongoose.Types.ObjectId);
            queryFindCond['_id'] = { $in: parentIds };
            queryFindCond[meta.propertyKey + '._id'] = objectId;
            let updateMongoOperator = Utils.getMongoUpdatOperatorForRelation(meta);
            updateSet[meta.propertyKey + updateMongoOperator] = embedSelectedPropertiesOnly(meta.params, [objs[i]])[0];
            bulk.find(queryFindCond).update({ $set: updateSet });
        }

        return Q.nbind(bulk.execute, bulk)().then(result => {
            var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
            var asyncCalls = [];
            var isEmbedded = Enumerable.from(allReferencingEntities).any(x => x.params && x.params.embedded);
            if (isEmbedded) {
                return mongooseModel.findMany(model, parentIds).then((objects: Array<any>) => {
                    return updateParent(model, objects).then(res => {
                        return objects;
                    });
                });
            }
            return objs;
        })
    })
        .catch(error => {
            winstonLog.logError(`Error in updateParentDocument ${error}`);
            return Q.reject(error);
        });
}

function updateParentDocumentOld(model: Mongoose.Model<any>, meta: MetaData, objs: Array<any>) {
    var queryCond = {};
    var ids = Enumerable.from(objs).select(x => x['_id']).toArray();
    var strIds = ids.map(x => x.toString());
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
                            var index = strIds.indexOf(x['_id'].toString());
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
                        var index = strIds.indexOf(values['_id'].toString());
                        newUpdate[meta.propertyKey] = objs[index];
                    }
                    asyncCall.push(mongooseModel.put(model, doc['_id'], newUpdate));
                });
                return Q.allSettled(asyncCall);
            }
        });
}

function bulkDelete(model: Mongoose.Model<any>, ids: any) {
    return mongooseModel.findMany(model, ids).then((data: Array<any>) => {
        return Q.nbind(model.remove, model)({
            '_id': {
                $in: ids
            }
        }).then(x => {
            var asyncCalls = [];
            // will not call update embedded parent because these children should not exist without parent
            asyncCalls.push(deleteCascade(model, data));
            return Q.allSettled(asyncCalls);
        });
    });
}

function patchAllEmbedded(model: Mongoose.Model<any>, prop: string, updateObjs: Array<any>, entityChange: EntityChange, isEmbedded: boolean, childModel: Mongoose.Model<any>, isArray?: boolean): Q.Promise<any> {
    var searchQueryCond = {};
    var pullQuery = {};
    pullQuery[prop] = {};
    var changesObjIds = {
        $in: updateObjs.map(x => x._id)
    };
    isEmbedded ? searchQueryCond[prop + '._id'] = changesObjIds : searchQueryCond[prop] = changesObjIds;
    isEmbedded ? pullQuery[prop]['_id'] = changesObjIds : pullQuery[prop] = changesObjIds;
    return Q.nbind(model.find, model)(searchQueryCond, { '_id': 1 }).then((parents: any) => {
        parents = Utils.toObject(parents);
        if (!parents || !parents.length) return Q.when(true);
        parents = parents.map(x => x._id);
        console.log(prop);
        let setCondition = {};
        setCondition['$unset'] = {};
        setCondition['$unset'][prop] = "";
        searchQueryCond['_id'] = { $in: parents };
        var prom = isArray ? Q.nbind(model.update, model)({ _id: { $in: parents } }, { $pull: pullQuery }, { multi: true }) : Q.nbind(model.update, model)(searchQueryCond, setCondition, { multi: true });
        return prom.then(res => {
            var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
            var asyncCalls = [];
            var isEmbedded = Enumerable.from(allReferencingEntities).any(x => x.params && x.params.embedded);
            if (isEmbedded) {
                // fetch all the parent and call update parent
                return Q.nbind(model.find, model)({
                    '_id': {
                        $in: parents
                    }
                }).then((result: any) => {
                    return updateParent(model, Utils.toObject(result));
                });
            }
            else {
                return res;
            }
        })
    }).catch(error => {
        winstonLog.logError(`Error in patchAllEmbedded ${error}`);
        return Q.reject(error);
    });
}

// updateEmbeddedParent(model: Mongoose.Model<any>, queryCond, result, property: string) {
//    if (result['nModified'] == 0)
//        return;

//    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));

//    var first = Enumerable.from(allReferencingEntities).where(x => (<IAssociationParams>x.params).embedded).firstOrDefault();
//    if (!first)
//        return;

//    winstonLog.logInfo(`updateEmbeddedParent query is ${queryCond}`);
//    // find the objects and then update these objects
//    return Q.nbind(model.find, model)(queryCond)
//        .then(updated => {
//            // Now update affected documents in embedded records
//            var asyncCalls = [];
//            Enumerable.from(updated).forEach(x => {
//                asyncCalls.push(updateEmbeddedOnEntityChange(model, EntityChange.patch, x, [property]));
//            });
//            return Q.all(asyncCalls);

//        }).catch(error => {
//            winstonLog.logError(`Error in updateEmbeddedParent ${error}`);
//            return Q.reject(error);
//        });
//}

function isDataValid(model: Mongoose.Model<any>, val: any, id: any) {
    var asyncCalls = [];
    var ret: boolean = true;
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        if (val[m.propertyKey]) {
            asyncCalls.push(isRelationPropertyValid(model, m, val[m.propertyKey], id).then(res => {
                if (res != undefined && !res) {
                    let error: any = new Error();
                    error.propertyKey = m.propertyKey;
                    throw error;
                }
            }));
        }
    });
    return Q.all(asyncCalls).catch(f => {
        let errorMessage = 'Invalid value. Adding to property ' + "'" + f.propertyKey + "'" + ' will break the relation in model: ' + model.modelName;
        winstonLog.logError(errorMessage);
        throw errorMessage;
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

function updateEntity(targetModel: Object, propKey: string, targetPropArray: boolean, updatedObjects: Array<any>, embedded: boolean, entityChange: EntityChange, childModel: Mongoose.Model<any>): Q.Promise<any> {
    var meta = MetaUtils.getMetaData(targetModel, Decorators.DOCUMENT);

    if (!meta) {
        throw 'Could not fetch metadata for target object';
    }
    var targetModelMeta = meta[0];
    var repoName = (<IDocumentParams>targetModelMeta.params).name;
    var model = Utils.getCurrentDBModel(repoName);
    if (!model) {
        winstonLog.logError('no repository found for relation');
        throw 'no repository found for relation';
    }
    return patchAllEmbedded(model, propKey, updatedObjects, entityChange, embedded, childModel, targetPropArray);
}

export function fetchEagerLoadingProperties(model: Mongoose.Model<any>, val: any): Q.Promise<any> {
    var asyncCalls = [];
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        if (param && !param.embedded && param.eagerLoading && val[m.propertyKey]) {
            var relModel = Utils.getCurrentDBModel(param.rel);
            if (m.propertyType.isArray) {
                if (val[m.propertyKey].length > 0) {
                    asyncCalls.push(mongooseModel.findMany(relModel, val[m.propertyKey]).then(res => {
                        val[m.propertyKey] = res;
                    }));
                }
            }
            else {
                asyncCalls.push(mongooseModel.findMany(relModel, [val[m.propertyKey]]).then(res => {
                    val[m.propertyKey] = res[0];
                }));
            }
        }
    });

    return Q.allSettled(asyncCalls).then(result => {
        return val;
    });
}

function embedChild(objects: Array<any>, prop, relMetadata: MetaData, parentModelName: string): Q.Promise<any> {
    var searchResult = {};
    var objs = [];
    var searchObj = [];
    let params: IAssociationParams = <any>relMetadata.params;
    objects.forEach((obj, index) => {
        if (!obj[prop])
            return;
        var val = obj[prop];
        var newVal;
        if (relMetadata.propertyType.isArray) {
            newVal = [];
            for (var i in val) {
                if (CoreUtils.isJSON(val[i])) {
                    if (!val[i]['_id']) {
                        val[i]['batch'] = index;
                        val[i][parentModelName + '.' + prop] = obj._id ? obj._id : obj['_tempId'];
                        objs.push(val[i]);
                    }
                    else {
                        val[i]['_id'] = Utils.castToMongooseType(val[i]['_id'].toString(), Mongoose.Types.ObjectId);
                        if (params.embedded) {
                            newVal.push(val[i]);
                        }
                        else {
                            newVal.push(val[i]['_id']);
                        }
                    }
                }
                else {
                    if (!params.embedded) {
                        newVal.push(Utils.castToMongooseType(val[i].toString(), Mongoose.Types.ObjectId));
                    }
                    else {
                        // find object
                        searchResult[val[i]] = obj;
                        searchObj.push(val[i]);
                        //newVal.push(searchResult[val[i]]);
                    }
                }
            }
        }
        else {
            if (CoreUtils.isJSON(val)) {
                if (!val['_id']) {
                    val['batch'] = index;
                    val[parentModelName + '.' + prop] = obj._id ? obj._id : obj['_tempId'];
                    objs.push(val);
                }
                else {
                    val['_id'] = Utils.castToMongooseType(val['_id'].toString(), Mongoose.Types.ObjectId);
                    if (params.embedded) {
                        newVal = val;
                    }
                    else {
                        newVal = val['_id'];
                    }
                }
            }
            else {
                if (!params.embedded) {
                    newVal = Utils.castToMongooseType(val.toString(), Mongoose.Types.ObjectId);
                }
                else {
                    // find object
                    searchResult[val] = obj;
                    searchObj.push(val);
                    //newVal = searchResult[val];
                }
            }
        }
        obj[prop] = newVal;
    });

    let queryCalls = [];
    let relModel = Utils.getCurrentDBModel(params.rel);
    if (objs.length > 0) {
        let repo: DynamicRepository = repoFromModel[relModel.modelName];
        queryCalls.push(repo.bulkPost(objs).then(res => {
            res.forEach(obj => {
                var val = params.embedded ? obj : obj['_id'];
                if (relMetadata.propertyType.isArray) {
                    objects[obj['batch']][prop].push(val);
                }
                else {
                    objects[obj['batch']][prop] = val;
                }
            });
        }));
    }
    if (searchObj.length > 0) {
        queryCalls.push(mongooseModel.findMany(relModel, searchObj).then((res: Array<any>) => {
            // set searched objects into actual objects
            res.forEach(obj => {
                var val = params.embedded ? obj : obj['_id'];
                if (relMetadata.propertyType.isArray) {
                    searchResult[obj['_id']][prop].push(val);
                }
                else {
                    searchResult[obj['_id']][prop] = val;
                }
            });
        }));
    }

    return Q.allSettled(queryCalls).then(res => {
        objects.forEach(obj => {
            if (obj[prop]) {
                obj[prop] = embedSelectedPropertiesOnly(params, obj[prop]);
            }
        });
    });
}

function embedSelectedPropertiesOnly(params: IAssociationParams, result: any) {
    if (result && params.properties && params.properties.length > 0 && params.embedded) {
        if (result instanceof Array) {
            var newResult = [];
            result.forEach(x => {
                newResult.push(trimProperties(x, params.properties));
            });
            return newResult;
        }
        else {
            return trimProperties(result, params.properties);
        }
    }
    return result;
}

function trimProperties(data, props: Array<string>) {
    var updated = {};
    updated['_id'] = data['_id'];
    props.forEach(p => {
        if (data[p] || data[p] === 0 || data[p] === false) {
            updated[p] = data[p];
        }
    });
    return updated;
}

function getFilteredValues(values: [any], properties: [string]) {
    var result = [];
    values.forEach(x => {
        var val = getFilteredValue(x, properties);
        if (val) {
            result.push(val);
        }
    });
    return result;
}

function getFilteredValue(value, properties: [string]) {
    if (properties && properties.length > 0) {
        var json = {};
        if (value['_id']) {
            json['_id'] = value['_id'];
        }
        properties.forEach(x => {
            if (value[x])
                json[x] = value[x];
        });
        if (JSON.stringify(json) == '{}') {
            return null;
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

