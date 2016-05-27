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
                    console.log(ex);
                    return Q.reject(ex);
                }
            });

            return Q.nbind(model.create, model)(clonedModels).then(result => {
                return Enumerable.from(result).select(x => toObject(x)).toArray();
            })
                .catch(error => {
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
        .catch(error => error);
}

export function findAll(model: Mongoose.Model<any>): Q.Promise<any> {
    return Q.nbind(model.find, model)({})
        .then(result => {
            return toObject(result);
        })
}

export function findWhere(model: Mongoose.Model<any>, query): Q.Promise<any> {
    return Q.nbind(model.find, model)(query)
        .then(result => {
            return toObject(result);
        });
}

export function findOne(model: Mongoose.Model<any>, id) {
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            return embeddedChildren(model, result)
                .then(r => {
                    return toObject(r);
                });
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
            console.error(err);
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
            console.error(error);
            return Q.reject(error);
        }
        return toObject(result);
    });
}

export function findChild(model: Mongoose.Model<any>, id, prop): Q.Promise<any> {
    return Q.nbind(model.findOne, model)({ '_id': id })
        .then(result => {
            var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));
            if (Enumerable.from(metas).any(x => x.propertyKey == prop)) {
                return embeddedChildren(model, result)
                    .then(r => {
                        var res = toObject(result);
                        return r[prop];
                    });
            }
            else {
                var res = toObject(result);
                return res[prop];
            }
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
            console.error(error);
            return Q.reject(error);
        });
}

export function del(model: Mongoose.Model<any>, id: any): Q.Promise<any> {
    return Q.nbind(model.findOneAndRemove, model)({ '_id': id })
        .then((response: any) => {
            return updateEmbeddedOnEntityChange(model, EntityChange.delete, response)
                .then(res => {
                    return deleteCascade(model, toObject(response)).then(x => {
                        return ({ delete: 'success' });
                    });
                });
        })
        .catch(err => {
            return Q.reject('delete failed');
        });
}

export function put(model: Mongoose.Model<any>, id: any, obj: any): Q.Promise<any> {
    let clonedObj = removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = getUpdatedProps(clonedObj);
        return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, updatedProps, { upsert: true, new: true })
            .then(result => {
                return updateEmbeddedOnEntityChange(model, EntityChange.put, result)
                    .then(res => {
                        let resObj = toObject(result);
                        Object.assign(obj, resObj);
                        return obj;
                    });
            });
    }).catch(error => {
        console.error(error);
        return Q.reject(error);
    });
}

export function patch(model: Mongoose.Model<any>, id: any, obj): Q.Promise<any> {
    let clonedObj = removeTransientProperties(model, obj);
    // First update the any embedded property and then update the model
    return addChildModelToParent(model, clonedObj, id).then(result => {
        var updatedProps = getUpdatedProps(clonedObj);
        return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, updatedProps, { new: true })
            .then(result => {
                return updateEmbeddedOnEntityChange(model, EntityChange.patch, result)
                    .then(res => {
                        let resObj = toObject(result);
                        Object.assign(obj, resObj);
                        return obj;
                    });
            });
    }).catch(error => {
        console.error(error);
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
                    return updateEmbeddedParent(model, queryCond, result);
                });

        }
        else {
            var pullObj = {};
            pullObj[prop] = {};
            pullObj[prop]['_id'] = updateObj['_id'];

            return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                .then(result => {
                    return updateEmbeddedParent(model, queryCond, result);
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
                        return updateEmbeddedParent(model, queryCond, result);
                    });
            }
            else {
                pullObj[prop] = null;
                var cond = {};
                cond[prop] = updateObj['_id'];

                return Q.nbind(model.update, model)(cond, { $set: pullObj }, { multi: true })
                    .then(result => {
                        //console.log(result);
                        return updateEmbeddedParent(model, queryCond, result);
                    });
            }
        }
    }
}

function updateEmbeddedParent(model: Mongoose.Model<any>, queryCond, result) {
    if (result['nModified'] == 0)
        return;

    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));

    var first = Enumerable.from(allReferencingEntities).where(x => (<IAssociationParams>x.params).embedded).firstOrDefault();
    if (!first)
        return;

    // find the objects and then update these objects
    return Q.nbind(model.find, model)(queryCond)
        .then(updated => {
            var ids = Enumerable.from(updated).select(x => x['_id']).toArray();
            return findAndUpdateEmbeddedData(model, ids);
        });
}

function getUpdatedProps(obj: any) {
    var push = {};
    var set = {};
    var unset = {};
    var s = false, u = false, p = false;
    for (var i in obj) {
        if (obj[i] == undefined || obj[i] == null || obj[i] == undefined && obj[i] == '' || obj[i] == [] || obj[i] == {}) {
            unset[i] = obj[i];
            u = true;
        }
        else if (obj[i] instanceof Array) {
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

function embeddedChildren(model: Mongoose.Model<any>, val: any) {
    if (!model)
        return;

    var asyncCalls = [];
    var metas = CoreUtils.getAllRelationsForTargetInternal(getEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        if (!param.embedded && param.eagerLoading) {
            var relModel = getModel(param.rel);
            if (m.propertyType.isArray) {
                asyncCalls.push(findMany(relModel, val[m.propertyKey])
                    .then(result => {
                        var childCalls = [];
                        var updatedChild = [];
                        Enumerable.from(result).forEach(res => {
                            childCalls.push(embeddedChildren(relModel, res).then(r => {
                                updatedChild.push(r);
                            }));
                        });
                        return Q.all(childCalls).then(r => {
                            val[m.propertyKey] = updatedChild;
                        });
                    }));
            }
            else {
                asyncCalls.push(findOne(relModel, val[m.propertyKey])
                    .then(result => {
                        return Q.resolve(embeddedChildren(relModel, result).then(r => {
                            val[m.propertyKey] = r;
                        }));
                    }));
            }
        }
    });

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

function findAndUpdateEmbeddedData(model: Mongoose.Model<any>, ids: any[]): Q.Promise<any> {
    return Q.nbind(model.find, model)({
        '_id': {
            $in: ids
        }
    }).then(result => {
        // Now update affected documents in embedded records
        var asyncCalls = [];
        Enumerable.from(result).forEach(x => {
            asyncCalls.push(updateEmbeddedOnEntityChange(model, EntityChange.patch, x));
        });
        return Q.all(asyncCalls);
    });
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
                throw TypeError(model.modelName + ': ' + metaData.propertyKey + ' - ' + 'Invalid autogenerated type');
            }
        });
}

function updateEmbeddedOnEntityChange(model: Mongoose.Model<any>, entityChange: EntityChange, obj: any) {
    var allReferencingEntities = CoreUtils.getAllRelationsForTarget(getEntity(model.modelName));
    var asyncCalls = [];
    Enumerable.from(allReferencingEntities)
        .forEach((x: MetaData) => {
            asyncCalls.push(updateEntity(x.target, x.propertyKey, x.propertyType.isArray, obj, (<IAssociationParams>x.params).embedded, entityChange));
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
    for (var prop in obj) {
        var metaArr = MetaUtils.getMetaDataForPropKey(getEntity(model.modelName), prop);
        var relationDecoratorMeta: [MetaData] = <any>Enumerable.from(metaArr)
            .where((x: MetaData) => CoreUtils.isRelationDecorator(x.decorator))
            .toArray();

        if (!relationDecoratorMeta || relationDecoratorMeta.length == 0) {
            continue;
        }
        if (relationDecoratorMeta.length > 1) {
            throw 'too many relations in single model';
        }

        asyncCalls.push(embedChild(obj, prop, relationDecoratorMeta[0]));
    }
    return Q.all(asyncCalls).then(x => {
        return isDataValid(model, obj, id);
    });
}

function embedChild(obj, prop, relMetadata: MetaData): Q.Promise<any> {
    if (!obj[prop])
        return;

    if (relMetadata.propertyType.isArray && !(obj[prop] instanceof Array)) {
        throw 'Expected array, found non-array';
    }
    if (!relMetadata.propertyType.isArray && (obj[prop] instanceof Array)) {
        throw 'Expected single item, found array';
    }

    var createNewObj = [];
    var params: IAssociationParams = <any>relMetadata.params;
    var relModel = getModel(params.rel);
    var val = obj[prop];
    var newVal = val;
    var prom: Q.Promise<any> = Q.when();

    if (relMetadata.propertyType.isArray) {
        newVal = [];
        var objs = [];
        for (var i in val) {
            if (val[i].toString() == "[object Object]") {
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
        if (val.toString() == "[object Object]") {
            if (val['_id']) {
                obj[prop] = val['_id'];
            }
            else {
                prom = post(relModel, val);
            }
        }
    }
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

        return findMany(relModel, castAndGetPrimaryKeys(obj, prop, relMetadata))
            .then(result => {
                if (result && result.length > 0) {
                    if (params.embedded) {
                        obj[prop] = obj[prop] instanceof Array ? result : result[0];
                    }
                    else {
                        // Verified that foriegn keys are correct and now update the Id
                        obj[prop] = obj[prop] instanceof Array ? Enumerable.from(result).select(x => x['_id']).toArray() : result[0]['_id'];
                    }
                }
            }).catch(error => {
                console.error(error);
                return Q.reject(error);
            });
    });
}

function castAndGetPrimaryKeys(obj, prop, relMetaData: MetaData): Array<any> {
    var primaryMetaDataForRelation = CoreUtils.getPrimaryKeyMetadata(relMetaData.target);

    if (!primaryMetaDataForRelation) {
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

//export function ExampleQPromise(model: Mongoose.Model<any>, id) {
//    return Q.nbind(model.findOne, model)({ '_id': id })
//        .then(result => {
//            var res = toObject(result);
//            var asyncCalls = [];
//            asyncCalls.push(findMany(model, [id]).then(val => {
//                var nestedCalls = [];
//                var nestedVal = {};

//                nestedCalls.push(findMany(model, [id]).then(val => {
//                    nestedVal['AA'] = val;
//                }));

//                nestedCalls.push(findMany(model, [id]).then(val => {
//                    nestedVal['AB'] = val;
//                }));

//                nestedCalls.push(findMany(model, [id]).then(val => {
//                    nestedVal['AC'] = val;
//                }));

//                return Q.all(nestedCalls).then(val => {
//                    res['A'] = nestedVal;
//                    return res;
//                });

//            }));

//            asyncCalls.push(findMany(model, [id]).then(val => {
//                res['B'] = val;
//            }));

//            asyncCalls.push(findMany(model, [id]).then(val => {
//                res['C'] = val;
//            }));

//            return Q.all(asyncCalls).then(ret => {
//                return res;
//            });
//        });
//}