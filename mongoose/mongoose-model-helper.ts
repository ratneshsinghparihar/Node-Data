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
import { ConstantKeys } from '../core/constants';
import { StorageType } from "../core/enums/index";
import {ShardInfo} from '../core/interfaces/shard-Info';
import {getDbSpecifcModel} from './db';
import {InstanceService} from '../core/services/instance-service';

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
                asyncCalls.push(updateParentDocument1(model, x, objs));
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

export function removeGivenTransientProperties(model: Mongoose.Model<any>, obj: any, transientProps: Array<MetaData>): any {
    transientProps.forEach(element => {
        delete obj[element.propertyKey];
    });
    return obj;
}

export function getAllTransientProps(model: Mongoose.Model<any>) {
    var transientProps = Enumerable.from(MetaUtils.getMetaData(getEntity(model.modelName))).where((ele: MetaData, idx) => {
        if (ele.decorator === Decorators.TRANSIENT) {
            return true;
        }
        return false;
    }).toArray();

    return transientProps;
}


//assuming relName is type of array already
export function transformEmbeddedChildern1(value: any, meta: MetaData) {

    if (!isJsonMapEnabled(meta.params) || !meta.propertyType.isArray) {
        return;
    }
    var relName = meta.propertyKey;
    // If already array then retun;
    if (!value || value[relName] instanceof Array)
        return;

    if (!value[relName]) {
        value[relName] = [];
        return;
    }

    console.log("transform_overHead_start - ", meta.propertyKey);
    let transformedData = [];
    for (let key in value[relName]) {
        transformedData.push(value[relName][key]);
    }
    // delete value[relName];
    value[relName] = transformedData;
    console.log("transform_overHead_start - ", meta.propertyKey);
}

export function transformAllEmbeddedChildern1(model: any, objs: Array<any>) {
    getEmbeddedPropWithFlat(model).forEach(x => {
        objs.forEach(object => {
            transformEmbeddedChildern1(object, x);
        });
    });
}

export function getEmbeddedPropWithFlat(model: any) {
    let allReferencingEntities = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
    return allReferencingEntities.filter(x => x.params && x.params.embedded && isJsonMapEnabled(x.params)).map(x => x);
}

export function embeddedChildren1(model: Mongoose.Model<any>, values: Array<any>, force: boolean, donotLoadChilds?: boolean) {
    if (!model)
        return;

    if (donotLoadChilds) {
        return Q.when(values);
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
            var ids = [];
            values.forEach(val => {
                if (!val) {
                    return;
                }

                if (m.propertyType.isArray) {
                    transformEmbeddedChildern1(val, m);
                }

                if (!val[m.propertyKey] || (val[m.propertyKey] instanceof Array && !val[m.propertyKey].length))
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
 * This method used to get actual child object from relation where storage type is jsonmap.
 * This is used in cascadeDelete.
 * @param props 
 * @param isJsonMap 
 */
function getListOfObjectsTobeDeleted(props, isJsonMap: boolean) {
    let listOfAllSameObjects = [];
    if (CoreUtils.isJSON(props) && isJsonMap) {
        for (let i = 0, len = props.length; i < len; i++) {
            for (let key in props[i]) {
                listOfAllSameObjects.push(props[i][key]);
            }
        }
    } else {
        listOfAllSameObjects = props.reduce((prev, current) => {
            return prev.concat(current);
        });
    }
    return listOfAllSameObjects;
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
        let isJsonMap = isJsonMapEnabled(x);
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
                let listOfAllSameObjects = getListOfObjectsTobeDeleted(props, isJsonMap);
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
                let listOfAllSameIds = getListOfObjectsTobeDeleted(props, isJsonMap);
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
                let isJsonMap = isJsonMapEnabled(param);
                //var newObj = getFilteredValue(obj, param.properties);
                asyncCalls.push(updateEntity(x.target, x.propertyKey, x.propertyType.isArray, obj, param.embedded, entityChange, model, isJsonMap));
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
    //if (PrincipalContext) {
    //    var count = PrincipalContext.get('write');
    //    PrincipalContext.save('write', ++count);
    //}

}

//function updateParentDocumentEasy(model: Mongoose.Model<any>, meta: MetaData, objs: Array<any>) {

//        //var queryCond = {};
//        //var ids = Enumerable.from(objs).select(x => x['_id']).toArray();
//        //queryCond[meta.propertyKey + '.parentId'] = { $in: ids };

//       // updateWriteCount();
//        console.log("updateParentDocument_start " + model.modelName );
//        let parent = {};
//        // parent._id = objs[0].parentId;
//        parent[meta.propertyKey] = {};
//        objs.forEach((child) => {
//            parent[meta.propertyKey][child._id] = child;
//        })

//        var bulk = model.collection.initializeUnorderedBulkOp();

//        var objectId = Utils.castToMongooseType(objs[0].parentId, Mongoose.Types.ObjectId);


//        bulk.find({ _id: objectId }).update({ $set: parent });

//        return Q.nbind(bulk.execute, bulk)().then(updatedParents => {
//            // return mongooseModel.put(model, parent._id, parent).then((updatedParents) => {
//            console.log("updateParentDocument_end " + model.modelName );
//            return updatedParents;
//        });

//    }

//function updateParentWithoutParentId(model: Mongoose.Model<any>, meta: MetaData, objs: Array<any>) {
//    var queryCond = {};
//    var ids = Enumerable.from(objs).select(x => x['_id']).toArray();
//    queryCond[meta.propertyKey + '._id'] = { $in: ids };
//    console.log("updateParentDocument find start" + model.modelName + " count " + ids.length);
//    updateWriteCount();
//    return Q.nbind(model.find, model)(queryCond, { '_id': 1 }).then((result: Array<any>) => {
//        console.log("updateParentDocument find end" + model.modelName + " count " + ids.length);
//        if (!result) {
//            return Q.resolve([]);
//        }
//        if (result && !result.length) {
//            return Q.resolve(result);
//        }
//        var parents: Array<any> = Utils.toObject(result);
//        var parentIds = parents.map(x => x._id);
//        var bulk = model.collection.initializeUnorderedBulkOp();
//        // classic for loop used gives high performanance
//        for (var i = 0; i < objs.length; i++) {
//            var queryFindCond = {};
//            var updateSet = {};
//            var objectId = Utils.castToMongooseType(objs[i]._id, Mongoose.Types.ObjectId);
//            queryFindCond['_id'] = { $in: parentIds };
//            let isJsonMap = isJsonMapEnabled(meta.params);
//            if (isJsonMap) {
//                updateSet[meta.propertyKey + '.' + objs[i]._id.toString()] = embedSelectedPropertiesOnly(meta.params, [objs[i]])[0];
//            }
//            else {
//                let updateMongoOperator = Utils.getMongoUpdatOperatorForRelation(meta);
//                updateSet[meta.propertyKey + updateMongoOperator] = embedSelectedPropertiesOnly(meta.params, [objs[i]])[0];
//            }
//            bulk.find(queryFindCond).update({ $set: updateSet });
//        }
//        console.log("updateParentDocument bulk execute start" + model.modelName + " count " + ids.length);
//        return Q.nbind(bulk.execute, bulk)().then(result => {
//            return parentIds;
//        });
//    });
//}


function updateParentWithParentId(model: Mongoose.Model<any>, meta: MetaData, objs: Array<any>) {
    let parents = {};
    let isJsonMap = isJsonMapEnabled(meta.params);
    let parentObjectId;
    console.log("updateParentWithParentId start" + model.modelName);
    for (var i = 0; i < objs.length; i++) {
        let parentId = objs[i][ConstantKeys.parent][ConstantKeys.parentId].toString();
        parents[parentId] = parents[parentId] ? parents[parentId] : (isJsonMap ? {} : []);
        // check meta then update with array or keyvalue
        if (isJsonMap) {
            parents[parentId][meta.propertyKey + '.' + objs[i]._id.toString()] = embedSelectedPropertiesOnly(meta.params, [objs[i]])[0];
        }
        else {
            var queryFindCond = {};
            queryFindCond['_id'] = new Mongoose.mongo.ObjectID(parentId);
            queryFindCond[meta.propertyKey + '._id'] = objs[i]._id;
            let updateMongoOperator = Utils.getMongoUpdatOperatorForRelation(meta);
            let updateSet = {};
            updateSet[meta.propertyKey + updateMongoOperator] = embedSelectedPropertiesOnly(meta.params, [objs[i]])[0];
            parents[parentId].push({ cond: queryFindCond, updateSet: updateSet });
        }
    }

    if (Object.keys(parents).length == 0)
        return Q.when([]);

    // console.log("parents", parents);
    //it has to be group by
    let newModel = getChangedModelForDynamicSchema(model, parentObjectId);
    var bulk = newModel.collection.initializeUnorderedBulkOp();
    Object.keys(parents).forEach(x => {
        if (isJsonMap) {
            var queryFindCond = {};
            queryFindCond['_id'] = Utils.getCastObjectId(model, x);
            bulk.find(setShardCondition(model, queryFindCond)).update({ $set: parents[x] });
        }
        else {
            parents[x].forEach(item => {
                bulk.find(setShardCondition(model, item.cond)).update({ $set: item.updateSet });
            });
        }
    });
    return Q.nbind(bulk.execute, bulk)().then(result => {
        console.log(JSON.stringify(result));
        console.log("updateParentWithParentId end" + model.modelName);
        return Object.keys(parents);
    });
}

function updateParentDocument1(model: Mongoose.Model<any>, meta: MetaData, objects: Array<any>) {
    let noParentId = Enumerable.from(objects).where(x => !x[ConstantKeys.parent]).toArray();
    let withParent = Enumerable.from(objects).where(x => x[ConstantKeys.parent]).toArray();
    let prom;
    let asyncCalls = [];
    if (noParentId && noParentId.length) {
        asyncCalls.push(updateParentDocument(model, meta, noParentId));
    }
    if (withParent && withParent.length) {
        asyncCalls.push(updateParentWithParentId(model, meta, withParent));
    }
    return Q.allSettled(asyncCalls).then(allresult => {
        let parentIds = Enumerable.from(allresult.map(x => x.value)).selectMany(x => x).toArray();
        var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
        var asyncCalls = [];
        var isEmbedded = Enumerable.from(allReferencingEntities).any(x => x.params && x.params.embedded);
        if (isEmbedded && parentIds.length > 0) {
            console.log("updateParentDocument1 isEmbedded" + model.modelName);
            return mongooseModel.findMany(model, parentIds).then((objects: Array<any>) => {
                console.log("updateParentDocument1 findMany end" + model.modelName);
                return updateParent(model, objects).then(res => {
                    console.log("updateParentDocument1 updateParent end" + model.modelName);
                    return objects;
                });
            });
        }
        return objects;
    });
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
    console.log("updateParentDocument find start" + model.modelName + " count " + ids.length);
    updateWriteCount();
    //ToDo - For dynamic-schema (vertical sharding) , this will not work, it should try to search from all the shards
    return Q.nbind(model.find, model)(setShardCondition(model, queryCond), { '_id': 1 }).then((result: Array<any>) => {
        console.log("updateParentDocument find end" + model.modelName + " count " + ids.length);
        if (!result) {
            return Q.resolve([]);
        }
        if (result && !result.length) {
            return Q.resolve(result);
        }
        var parents: Array<any> = Utils.toObject(result);
        var parentIds = parents.map(x => x._id);
        let allBulkExecute = {}; 
        // classic for loop used gives high performanance
        for (var i = 0; i < objs.length; i++) {
            var queryFindCond = {};
            var updateSet = {};
            let newModel = getNewModelFromObject(model, objs[i]);
            var objectId = Utils.getCastObjectId(model, objs[i]._id);
            if (!allBulkExecute[newModel.modelName]) {
                allBulkExecute[newModel.modelName] = newModel.collection.initializeUnorderedBulkOp();
            }
            let bulk = allBulkExecute[newModel.modelName];

            queryFindCond['_id'] = { $in: parentIds };
            queryFindCond[meta.propertyKey + '._id'] = objectId;
            let updateMongoOperator = Utils.getMongoUpdatOperatorForRelation(meta);
            updateSet[meta.propertyKey + updateMongoOperator] = embedSelectedPropertiesOnly(meta.params, [objs[i]])[0];
            bulk.find(setShardCondition(model, queryFindCond)).update({ $set: updateSet });
        }
        console.log("updateParentDocument bulk execute start" + model.modelName + " count " + ids.length);
        let asyncCalls = [];
        Object.keys(allBulkExecute).forEach(x => {
            let bulk = allBulkExecute[x];
            asyncCalls.push(Q.nbind(bulk.execute, bulk)());
        });
        return Q.allSettled(asyncCalls).then(result => {
            console.log("updateParentDocument bulk execute start" + model.modelName + " count " + ids.length);
            var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
            var asyncCalls = [];
            var isEmbedded = Enumerable.from(allReferencingEntities).any(x => x.params && x.params.embedded);
            if (isEmbedded) {
                console.log("updateParentDocument findmany start" + model.modelName + " count " + ids.length);
                return mongooseModel.findMany(model, parentIds).then((objects: Array<any>) => {
                    console.log("updateParentDocument findmany end" + model.modelName + " count " + ids.length);
                    console.log("updateParentDocument updateParent start" + model.modelName + " count " + ids.length);
                    return updateParent(model, objects).then(res => {
                        console.log("updateParentDocument updateParent end" + model.modelName + " count " + ids.length);
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

function bulkDelete(model: Mongoose.Model<any>, ids: any) {
    if (!ids || !ids.length) return Q.when([]);
    return mongooseModel.findMany(model, ids).then((data: Array<any>) => {
        let newModels = getAllShardModelsFromIds(model, ids);
        let asyncCalls = [];
        Object.keys(newModels).forEach(x => {
            asyncCalls.push(Q.nbind(newModels[x].remove, newModels[x])(setShardCondition(model, {
                '_id': {
                    $in: ids
                }
            })));
        });
        return Q.allSettled(asyncCalls).then(x => {
            asyncCalls = [];
            // will not call update embedded parent because these children should not exist without parent
            asyncCalls.push(deleteCascade(model, data));
            return Q.allSettled(asyncCalls);
        });
    });
}

/**
 * Get unset query for onetomany relationship where storegaType is json map.
 * This is used while updating parent after child deleted.
 * @param prop 
 * @param updateObjs 
 */
function getUnsetQueryForJsonMapStructure(prop, updateObjs) {
    let setCondition = {};
    setCondition['$unset'] = {};
    for (let i = 0, len = updateObjs.length; i < len; i++) {
        setCondition['$unset'][prop + "." + updateObjs[i]["_id"].toString()] = "";
    }
    return setCondition;
}
function patchAllEmbedded(model: Mongoose.Model<any>, prop: string, updateObjs: Array<any>, entityChange: EntityChange, isEmbedded: boolean, childModel: Mongoose.Model<any>, isArray?: boolean, isJsonMap?: boolean): Q.Promise<any> {
    var searchQueryCond = {};
    var pullQuery = {};
    pullQuery[prop] = {};
    var changesObjIds = {
        $in: updateObjs.map(x => x._id)
    };
    var parentIds = [];
    updateObjs.forEach(x => {
        if (x.parent && x.parent.parentId) {
            parentIds.push(x.parent.parentId);
        }
    });
    var isParentIdsPresent = parentIds && parentIds.length;
    isEmbedded ? searchQueryCond[prop + '._id'] = changesObjIds : searchQueryCond[prop] = changesObjIds;
    isEmbedded ? pullQuery[prop]['_id'] = changesObjIds : pullQuery[prop] = changesObjIds;
    // If parent ids are available then no need to call parent from db.
    //ToDo - For dynamic-schema (vertical sharding) , this will not work, it should try to search from all the shards
    var parentCallPromise = isParentIdsPresent ? Q.resolve(true) : Q.nbind(model.find, model)(setShardCondition(model, searchQueryCond), { '_id': 1 });
    return parentCallPromise.then((parents: any) => {
        if (!isParentIdsPresent) {
            parents = Utils.toObject(parents);
            if (!parents || !parents.length) return Q.when(true);
            parentIds = parents.map(x => x._id);
        }
        console.log(prop);
        let setCondition = {};
        setCondition['$unset'] = {};
        setCondition['$unset'][prop] = "";
        searchQueryCond['_id'] = { $in: parentIds };
        let setConditionForArr = (isArray && isJsonMap) ? getUnsetQueryForJsonMapStructure(prop, updateObjs) : { $pull: pullQuery };
        let newModel = getChangedModelForDynamicSchema(model, parentIds[0]);
        var prom = isArray ? Q.nbind(newModel.update, newModel)(setShardCondition(model, { _id: { $in: parentIds } }), setConditionForArr, { multi: true }) : Q.nbind(newModel.update, newModel)(setShardCondition(model, searchQueryCond), setCondition, { multi: true });
        return prom.then(res => {
            var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
            var asyncCalls = [];
            var isEmbedded = Enumerable.from(allReferencingEntities).any(x => x.params && x.params.embedded);
            if (isEmbedded) {
                // fetch all the parent and call update parent
                return Q.nbind(newModel.find, newModel)(setShardCondition(model, {
                    '_id': {
                        $in: parentIds
                    }
                })).then((result: any) => {
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

//function isDataValid(model: Mongoose.Model<any>, val: any, id: any) {
//    var asyncCalls = [];
//    var ret: boolean = true;
//    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
//    Enumerable.from(metas).forEach(x => {
//        var m: MetaData = x;
//        if (val[m.propertyKey]) {
//            asyncCalls.push(isRelationPropertyValid(model, m, val[m.propertyKey], id).then(res => {
//                if (res != undefined && !res) {
//                    let error: any = new Error();
//                    error.propertyKey = m.propertyKey;
//                    throw error;
//                }
//            }));
//        }
//    });
//    return Q.all(asyncCalls).catch(f => {
//        let errorMessage = 'Invalid value. Adding to property ' + "'" + f.propertyKey + "'" + ' will break the relation in model: ' + model.modelName;
//        winstonLog.logError(errorMessage);
//        throw errorMessage;
//    });
//}

//function isRelationPropertyValid(model: Mongoose.Model<any>, metadata: MetaData, val: any, id: any) {
//    switch (metadata.decorator) {
//        case Decorators.ONETOMANY: // for array of objects
//            if (metadata.propertyType.isArray) {
//                if (Array.isArray(val) && val.length > 0) {
//                    var queryCond = [];
//                    var params = <IAssociationParams>metadata.params;
//                    Enumerable.from(val).forEach(x => {
//                        var con = {};
//                        if (params.embedded) {
//                            con[metadata.propertyKey + '._id'] = x['_id'];
//                        }
//                        else {
//                            con[metadata.propertyKey] = { $in: [x] };
//                        }
//                        queryCond.push(con);
//                    });
//                    return Q.nbind(model.find, model)(getQueryCondition(id, queryCond))
//                        .then(result => {
//                            if (Array.isArray(result) && result.length > 0)
//                                return false;
//                            else
//                                return true;
//                        }).catch(error => {
//                            winstonLog.logError(`Error in isRelationPropertyValid ${error}`);
//                            return Q.reject(error);
//                        });
//                }
//            }
//            break;
//        case Decorators.ONETOONE: // for single object
//            if (!metadata.propertyType.isArray) {
//                if (!Array.isArray(val)) {
//                    var queryCond = [];
//                    var con = {};
//                    var params = <IAssociationParams>metadata.params;
//                    if (params.embedded) {
//                        con[metadata.propertyKey + '._id'] = val['_id'];
//                    }
//                    else {
//                        con[metadata.propertyKey] = { $in: [val] };
//                    }
//                    queryCond.push(con);

//                    return Q.nbind(model.find, model)(getQueryCondition(id, queryCond))
//                        .then(result => {
//                            if (Array.isArray(result) && result.length > 0) {
//                                return false;
//                            }
//                        }).catch(error => {
//                            winstonLog.logError(`Error in isRelationPropertyValid ${error}`);
//                            return Q.reject(error);
//                        });
//                }
//            }
//            break;
//        case Decorators.MANYTOONE: // for single object
//            // do nothing
//            return Q.when(true);
//        case Decorators.MANYTOMANY: // for array of objects
//            // do nothing
//            return Q.when(true);
//    }
//    return Q.when(true);
//}

//function getQueryCondition(id: any, cond: any): any {
//    if (id) {
//        return {
//            $and: [
//                { $or: cond },
//                { '_id': { $ne: id } }
//            ]
//        };
//    }
//    else {
//        return { $or: cond }
//    }
//}

function updateEntity(targetModel: Object, propKey: string, targetPropArray: boolean, updatedObjects: Array<any>, embedded: boolean, entityChange: EntityChange, childModel: Mongoose.Model<any>, isJsonMap?: boolean): Q.Promise<any> {
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
    return patchAllEmbedded(model, propKey, updatedObjects, entityChange, embedded, childModel, targetPropArray, isJsonMap);
}

export function fetchEagerLoadingProperties(model: Mongoose.Model<any>, values: Array<any>): Q.Promise<any> {
    if (!values || !values.length)
        return Q.when(values);

    var asyncCalls = [];
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        if (param && !param.embedded && param.eagerLoading) {
            values.forEach(val => {
                if (!val[m.propertyKey])
                    return;

                var relModel = Utils.getCurrentDBModel(param.rel);
                let repo: DynamicRepository = repoFromModel[relModel.modelName];
                if (m.propertyType.isArray) {
                    if (val[m.propertyKey].length > 0) {
                        asyncCalls.push(repo.getRootRepo().findMany(val[m.propertyKey]).then(res => {
                            val[m.propertyKey] = res;
                        }));
                    }
                }
                else {
                    asyncCalls.push(repo.getRootRepo().findMany([val[m.propertyKey]]).then(res => {
                        val[m.propertyKey] = res[0];
                    }));
                }
            });
        }
    });

    return Q.allSettled(asyncCalls).then(result => {
        return values;
    });
}
export function isJsonMapEnabled(params: IAssociationParams) {
    if (params && (params.storageType == StorageType.JSONMAP)) {
        return true;
    }
    return false;
}
function embedChild(objects: Array<any>, prop, relMetadata: MetaData, parentModelName: string): Q.Promise<any> {
    var searchResult = {};
    var objs = [];
    var searchObj = [];
    let params: IAssociationParams = <any>relMetadata.params;
    let isJsonMap = isJsonMapEnabled(params);
    let relModel = Utils.getCurrentDBModel(params.rel);
    objects.forEach((obj, index) => {
        if (!obj[prop])
            return;
        var val = obj[prop];
        var newVal;
        if (relMetadata.propertyType.isArray) {
            newVal = isJsonMap ? {} : [];
            for (var i in val) {
                if (CoreUtils.isJSON(val[i])) {
                    if (!val[i]['_id']) {
                        val[i]['batch'] = index;
                        val[i][ConstantKeys.parent] = Utils.getParentKey(parentModelName, prop, (obj._id ? obj._id : obj[ConstantKeys.TempId]));
                        objs.push(val[i]);
                    }
                    else {
                        val[i]['_id'] = Utils.getCastObjectId(relModel, val[i]['_id']);
                        if (params.embedded) {
                            // newVal.push(val[i]);
                            Utils.pushPropToArrayOrObject(val[i]['_id'].toString(), val[i], newVal, isJsonMap);
                        }
                        else {
                            // newVal.push(val[i]['_id']);
                            Utils.pushPropToArrayOrObject(val[i]['_id'].toString(), val[i]['_id'], newVal, isJsonMap);
                        }
                    }
                }
                else {
                    if (!params.embedded) {
                        newVal.push(Utils.getCastObjectId(relModel, val[i]));
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
                    val[ConstantKeys.parent] = Utils.getParentKey(parentModelName, prop, (obj._id ? obj._id : obj[ConstantKeys.TempId]));
                    objs.push(val);
                }
                else {
                    val['_id'] = Utils.getCastObjectId(relModel, val['_id']);
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
                    newVal = Utils.getCastObjectId(relModel, val);
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
    if (objs.length > 0) {
        let repo: DynamicRepository = repoFromModel[relModel.modelName];
        queryCalls.push(repo.bulkPost(objs).then(res => {
            res.forEach(obj => {
                var val = params.embedded ? obj : obj['_id'];
                if (relMetadata.propertyType.isArray) {
                    // objects[obj['batch']][prop].push(val);
                    Utils.pushPropToArrayOrObject(obj['_id'].toString(), val, objects[obj['batch']][prop], isJsonMap);
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
                obj[prop] = embedSelectedPropertiesOnly(params, obj[prop], true);
            }
        });
    });
}

function embedSelectedPropertiesOnly(params: IAssociationParams, result: any, isEmbeddedObjectInResult?: boolean) {
    if (result && params.properties && params.properties.length > 0 && params.embedded) {
        if (result instanceof Array) {
            var newResult = [];
            result.forEach(x => {
                newResult.push(trimProperties(x, params.properties));
            });
            return newResult;
        } else if (isEmbeddedObjectInResult) {
            let returnObject = {};
            for (let key in result) {
                returnObject[key] = trimProperties(result[key], params.properties);
            }
            return returnObject;
        } else {
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

// Implementation for vertical sharding
export function getChangedModelForDynamicSchema(model: Mongoose.Model<any>, id: any): Mongoose.Model<any> {
    let newModel = model;
    try {
        let obj: any = InstanceService.getInstanceFromType(getEntity(model.modelName), true);
        obj._id = id;
        return getNewModelFromObject(model, obj);
    } catch (ex) {
        winstonLog.logError(ex);
    }

    return newModel;
}

export function setUniqueIdFromShard(x: any) {
    let shard: ShardInfo = x;
    if (shard.getUniqueId) {
        x._id = shard.getUniqueId();
    }
}

export function getNewModelFromObject(model, obj: ShardInfo) {
    if (obj && obj.getCollectionNameFromSelf) {
        return getDbSpecifcModel(obj.getCollectionNameFromSelf(), model.schema);
    }
    return model;
}

// It returns all collection name and ids for these collection name
export function getAllShardModelsFromIds(model: Mongoose.Model<any>, ids: Array<string>): any {
    let shardModelInfo = {};
    try {
        let shardobj: ShardInfo = InstanceService.getInstanceFromType(getEntity(model.modelName), true);
        if (shardobj && shardobj.getCollectionNameFromSelf) {
            let obj: any = shardobj;
            ids.forEach(x => {
                obj._id = x;
                let newModel = getNewModelFromObject(model, obj);
                shardModelInfo[newModel.modelName] = newModel;
            });
        }
        else {
            shardModelInfo[model.modelName] = model;
        }

    } catch (ex) {
        winstonLog.logError(ex);
    }
    return shardModelInfo;
}

export function getAllTheShards(model: Mongoose.Model<any>) {
    let shardobj: ShardInfo = InstanceService.getInstanceFromType(getEntity(model.modelName), true);
    if (shardobj.getAllShardCollectionNames) {
        let newModels = [];
        newModels = shardobj.getAllShardCollectionNames().map(x => getDbSpecifcModel(x, model.schema));
        return newModels;
    }
    return [model];
}

// Implementation for horizontal sharding
export function setShardCondition(model, searchCond) {
    var meta = MetaUtils.getMetaData(getEntity(model.modelName), Decorators.REPOSITORY);
    if (meta && meta[0] && meta[0].params.sharded) {
        let repo: DynamicRepository = repoFromModel[model.modelName];
        let cond = repo.getShardCondition();
        if (cond) {
            Object.keys(cond).forEach(key => {
                searchCond[key] = cond[key];
            });
        }
    }
    return searchCond;
}