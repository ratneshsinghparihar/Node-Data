import Mongoose = require("mongoose");
import Q = require('q');
import {EntityChange} from '../enums/entity-change';
import * as MetaUtils from "../decorators/metadata/utils";
import * as Utils from "../utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {MetaData} from '../decorators/metadata/metadata';
import {IAssociationParams, IFieldParams, IDocumentParams} from '../decorators/interfaces/meta-params';
import {GetRepositoryForName} from '../dynamic/dynamic-repository';
import {GetEntity, GetModel} from "../dynamic/initialize-repositories";
var Enumerable: linqjs.EnumerableStatic = require('linq');

export function saveObjs(model: Mongoose.Model<any>, objArr: Array<any>): Q.Promise<any> {
    return Q.nbind(model.create, model)()
        .then(result => result)
        .catch(error => error);
}

export function findAll(model: Mongoose.Model<any>): Q.Promise<any> {
    return Q.nbind(model.find, model)({})
        .then(result => {
            return toObject(result);
        });;
}

export function findWhere(model: Mongoose.Model<any>, query): Q.Promise < any > {
    return Q.nbind(model.find, model)(query);
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

export function findByField(model: Mongoose.Model<any>,fieldName, value): Q.Promise < any > {
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

export function findMany(model: Mongoose.Model<any>,ids: Array<any>) {
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

export function findChild(model: Mongoose.Model<any>, id, prop) {
    var deferred = Q.defer();
    model.findOne({ '_id': id }, (err, res) => {
        if (err) {
            return deferred.reject(err);
        }
        return deferred.resolve(res);
    });
    return deferred.promise;

}

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
export function post(model: Mongoose.Model<any>, obj: any): Q.Promise<any> {
    return processEmbedding(model, obj)
        .then(result => {
            return isDataValid(model, obj, null).then(result => {
                try {
                    autogenerateIdsForAutoFields(model, obj);
                } catch (ex) {
                    console.log(ex);
                    return Q.reject(ex);
                }
                return Q.nbind(model.create, model)(new model(obj)).then(result => {
                    return toObject(result);
                });
            });
        }).catch(error => {
            console.error(error);
            return Q.reject(error);
        });
}

export function del(model: Mongoose.Model<any>, id: any): Q.Promise<any> {
    return Q.nbind(model.findOneAndRemove, model)({ '_id': id })
        .then((response: any) => {
            if (!response) {
                return Q.reject('delete failed');
            }
            return updateEmbeddedOnEntityChange(model, EntityChange.delete, response);
        });
}

export function put(model: Mongoose.Model<any>, id: any, obj: any): Q.Promise<any> {
    // First update the any embedded property and then update the model
    return processEmbedding(model, obj).then(result => {
        return isDataValid(model, obj, id).then(result => {
            return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, obj, { upsert: true, new: true })
                .then(result => {
                    updateEmbeddedOnEntityChange(model, EntityChange.put, result);
                    return toObject(result);
                });
        });
    }).catch(error => {
        console.error(error);
        return Q.reject(error);
    });
}

export function patch(model: Mongoose.Model<any>, id: any, obj): Q.Promise<any> {
    // First update the any embedded property and then update the model
    return processEmbedding(model, obj).then(result => {
        return isDataValid(model, obj, id).then(result => {
            return Q.nbind(model.findOneAndUpdate, model)({ '_id': id }, obj, { new: true })
                .then(result => {
                    updateEmbeddedOnEntityChange(model, EntityChange.patch, result);
                    return toObject(result);
                });
        });
    }).catch(error => {
        console.error(error);
        return Q.reject(error);
    });
}

export function patchAllEmbedded(model: Mongoose.Model<any>, prop: string, updateObj: any, entityChange: EntityChange, isEmbedded: boolean, isArray?: boolean): Q.Promise<any> {
    //var compareropWithId = '"' + prop + '._id"';
    //var updateProp = '"' + prop + '._id"';
    if (isEmbedded) {

        var queryCond = {};
        queryCond[prop + '._id'] = updateObj['_id'];

        return Q.nbind(model.find, model)(queryCond)
            .then(updated=> {

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
                            console.log(result);
                            var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                            findAndUpdateEmbeddedData(model, ids);
                        });

                }
                else {
                    var pullObj = {};
                    pullObj[prop] = {};
                    pullObj[prop]['_id'] = updateObj['_id'];

                    return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                        .then(result => {
                            console.log(result);
                            var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                            findAndUpdateEmbeddedData(model, ids);
                        });
                }
            });
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

            return Q.nbind(model.find, model)(queryCond)
                .then(updated=> {
                    console.log(cond + ' :count:' + (updated as any[]).length);

                    var pullObj = {};
                    pullObj[prop] = {};

                    if (isArray) {
                        pullObj[prop] = updateObj['_id'];
                        return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                            .then(result => {
                                console.log(result);
                                var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                                findAndUpdateEmbeddedData(model, ids);
                            });
                    }
                    else {
                        pullObj[prop] = null;
                        var cond = {};
                        cond[prop] = updateObj['_id'];

                        return Q.nbind(model.update, model)(cond, { $set: pullObj }, { multi: true })
                            .then(result => {
                                console.log(result);
                                var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                                findAndUpdateEmbeddedData(model, ids);
                            });
                    }
                });
        }
    }
}

function embeddedChildren(model: Mongoose.Model<any>, val: any){
    if (!model)
        return;

    var asyncCalls = [];
    var metas = MetaUtils.getAllRelationsForTargetInternal(GetEntity(model.modelName));

    Enumerable.from(metas).forEach(x => {
        var m: MetaData = x;
        var param: IAssociationParams = <IAssociationParams>m.params;
        if (!m.propertyType.embedded && param.eagerLoading) {
            var relModel = GetModel(m.propertyType.rel);
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

function isDataValid(model: Mongoose.Model<any>, val: any, id: any){
    var asyncCalls = [];
    var ret: boolean = true;
    var metas = MetaUtils.getAllRelationsForTargetInternal(GetEntity(model.modelName));
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

function isRelationPropertyValid(model: Mongoose.Model<any>, metadata: MetaData, val: any, id: any){
    switch (metadata.decorator) {
        case Decorators.ONETOMANY: // for array of objects
            if (metadata.propertyType.isArray) {
                if (Array.isArray(val) && val.length > 0) {
                    var queryCond = [];
                    Enumerable.from(val).forEach(x => {
                        var con = {};
                        if (metadata.propertyType.embedded) {
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
                    if (metadata.propertyType.embedded) {
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
            return Q(undefined);
        case Decorators.MANYTOMANY: // for array of objects
            // do nothing
            return Q(undefined);
    }
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
    }).then(result=> {
        // Now update affected documents in embedded records

        var asyncCalls = [];
        Enumerable.from(result).forEach(x=> {
            asyncCalls.push(updateEmbeddedOnEntityChange(model, EntityChange.patch, x));
        });

        //return Q.allSettled(asyncCalls);
    });
}

    /**
     * Autogenerate mongodb guid (ObjectId) for the autogenerated fields in the object
     * @param obj
     * throws TypeError if field type is not String, ObjectId or Object
     */
function autogenerateIdsForAutoFields(model: Mongoose.Model<any>, obj: any): void {
    var fieldMetaArr = MetaUtils.getAllMetaDataForDecorator(GetEntity(model.modelName), Decorators.FIELD);
    if (!fieldMetaArr) {
        return;
    }
    Enumerable.from(fieldMetaArr)
        .where((keyVal) => keyVal.value && keyVal.value.params && (<IFieldParams>keyVal.value.params).autogenerated)
        .forEach((keyVal) => {
            var metaData = <MetaData>keyVal.value;
            var objectId = new Mongoose.Types.ObjectId();
            if (metaData.propertyType.itemType === String) {
                obj[metaData.propertyKey] = objectId.toHexString();
            } else if (metaData.propertyType.itemType === Mongoose.Types.ObjectId || metaData.propertyType.itemType === Object) {
                obj[metaData.propertyKey] = objectId;
            } else {
                throw TypeError(model.modelName + ': ' + metaData.propertyKey + ' - ' + 'Invalid autogenerated type');
            }
        });
}

function merge(source, dest) {
    for (var key in source) {
        if (!dest[key] || dest[key] != source[key]) {
            dest[key] = source[key];
        }
    }
}

function updateEmbeddedOnEntityChange(model: Mongoose.Model<any>, entityChange: EntityChange, obj: any) {
    var allReferencingEntities = MetaUtils.getAllRelationsForTarget(GetEntity(model.modelName));
    var asyncCalls = [];
    Enumerable.from(allReferencingEntities)
        .forEach((x: MetaData) => {
            asyncCalls.push(updateEntity(x.target, x.propertyKey, x.propertyType.isArray, obj, (<IAssociationParams>x.params).embedded, entityChange));
        });
    return Q.allSettled(asyncCalls);
}

function updateEntity(targetModel: Object, propKey: string, targetPropArray: boolean, updatedObject: any, embedded: boolean, entityChange: EntityChange): Q.Promise<any> {
    var targetModelMeta = MetaUtils.getMetaData(targetModel, Decorators.DOCUMENT);
    if (!targetModelMeta) {
        throw 'Could not fetch metadata for target object';
    }
    var repoName = (<IDocumentParams>targetModelMeta.params).name;
    var model = GetModel(repoName);
    if (!model) {
        throw 'no repository found for relation';
    }
    return patchAllEmbedded(model, propKey, updatedObject, entityChange, embedded, targetPropArray);
}

function processEmbedding(model: Mongoose.Model<any>, obj: any) {
    var asyncCalls = [];
    for (var prop in obj) {
        var metaArr = MetaUtils.getAllMetaDataForField(GetEntity(model.modelName), prop);
        var relationDecoratorMeta: [MetaData] = <any>Enumerable.from(metaArr)
            .where((x: MetaData) => Utils.isRelationDecorator(x.decorator))
            .toArray();

        if (!relationDecoratorMeta || relationDecoratorMeta.length == 0) {
            continue;
        }
        if (relationDecoratorMeta.length > 1) {
            throw 'too many relations in single model';
        }
        //var params = <IAssociationParams>relationDecoratorMeta[0].params;
        asyncCalls.push(embedChild(obj, prop, relationDecoratorMeta[0]));
        //else if (!params.persist) {
        //    delete obj[prop];
        //    continue;
        //}
    }
    return Q.all(asyncCalls);
}

function embedChild(obj, prop, relMetadata: MetaData): Q.Promise<any> {
    if (!obj[prop] || (obj[prop] instanceof Array && obj[prop].length == 0)) {
        return Q.when();
    }
    if (relMetadata.propertyType.isArray && !(obj[prop] instanceof Array)) {
        throw 'Expected array, found non-array';
    }
    if (!relMetadata.propertyType.isArray && (obj[prop] instanceof Array)) {
        throw 'Expected single item, found array';
    }
    var params: IAssociationParams = <any>relMetadata.params;

    var repo = GetRepositoryForName(params.rel);
    if (!repo) {
        throw 'no repository found for relation';
    }

    var params = <IAssociationParams>relMetadata.params;

    return repo.findMany(castAndGetPrimaryKeys(obj, prop, relMetadata))
        .then(result => {
            if (params.embedded) {
                obj[prop] = obj[prop] instanceof Array ? result : result[0];
            }
            else {
                // Verified that foriegn keys are correct and now update the Id
                obj[prop] = obj[prop] instanceof Array ? Enumerable.from(result).select(x=> x['_id']).toArray() : result[0]['_id'];
            }
        }).catch(error => {
            console.error(error);
            return Q.reject(error);
        });
}

function castAndGetPrimaryKeys(obj, prop, relMetaData: MetaData): Array<any> {
    var primaryMetaDataForRelation = MetaUtils.getPrimaryKeyMetadata(relMetaData.target);

    if (!primaryMetaDataForRelation) {
        throw 'primary key not found for relation';
    }

    var primaryType = primaryMetaDataForRelation.propertyType.itemType;
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