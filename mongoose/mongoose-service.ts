import Mongoose = require('mongoose');
import Q = require('q');
import {EntityChange} from '../core/enums/entity-change';
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import * as CoreUtils from "../core/utils";
import * as Utils from "./utils";
import {Decorators} from '../core/constants/decorators';
import {DecoratorType} from '../core/enums/decorator-type';
import {MetaData} from '../core/metadata/metadata';
import {IAssociationParams} from '../core/decorators/interfaces';
import {IFieldParams, IDocumentParams} from './decorators/interfaces';
import {GetRepositoryForName} from '../core/dynamic/dynamic-repository';
import {GetEntity, GetModel} from "../core/initialize/initialize-repositories";
import {entityservice} from '../core/decorators/entityservice';
import {pathRepoMap} from './';
var Enumerable: linqjs.EnumerableStatic = require('linq');

export class MongooseService implements IEntityService {
    private _mongooseModel: Mongoose.Model<any>;

    constructor() {
    }

    saveObjs(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return Q.nbind(this.getMongooseModel(repoPath).create, this.getMongooseModel(repoPath))()
            .then(result => result)
            .catch(error => error);
    }

    findAll(repoPath: string): Q.Promise<any> {
        let model = this.getMongooseModel(repoPath);
        return Q.nbind(model.find, model)({})
            .then(result => {
                return this.toObject(result);
            });
    }

    findWhere(repoPath: string, query): Q.Promise<any> {
        return Q.nbind(this.getMongooseModel(repoPath).find, this.getMongooseModel(repoPath))(query);
    }

    findOne(repoPath: string, id) {
        return Q.nbind(this.getMongooseModel(repoPath).findOne, this.getMongooseModel(repoPath))({ '_id': id })
            .then(result => {
                return this.toObject(result);
            });
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        var param = {};
        param[fieldName] = value;
        return Q.nbind(this.getMongooseModel(repoPath).findOne, this.getMongooseModel(repoPath))(param)
            .then(result => {
                return this.toObject(result);
            },
            err => {
                console.error(err);
                return Q.reject(err);
            });
    }

    findMany(repoPath: string, ids: Array<any>) {
        return Q.nbind(this.getMongooseModel(repoPath).find, this.getMongooseModel(repoPath))({
            '_id': {
                $in: ids
            }
        }).then((result: any) => {
            if (result.length !== ids.length) {
                var error = 'findmany - numbers of items found:' + result.length + 'number of items searched: ' + ids.length;
                console.error(error);
                return Q.reject(error);
            }
            return this.toObject(result);
        });
    }

    findChild(repoPath: string, id, prop) {
        var deferred = Q.defer();
        this.getMongooseModel(repoPath).findOne({ '_id': id }, (err, res) => {
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
    post(repoPath: string, obj: any): Q.Promise<any> {
        var model = this.getMongooseModel(repoPath);
        return this.processEmbedding(model, obj)
            .then(result => {
                return this.isDataValid(model, obj, null).then(result => {
                    try {
                        this.autogenerateIdsForAutoFields(model, obj);
                    } catch (ex) {
                        console.log(ex);
                        return Q.reject(ex);
                    }
                    return Q.nbind(this.getMongooseModel(repoPath).create, this.getMongooseModel(repoPath))(new model(obj)).then(result => {
                        return this.toObject(result);
                    });
                });
            }).catch(error => {
                console.error(error);
                return Q.reject(error);
            });
    }

    put(repoPath: string, id: any, obj: any): Q.Promise<any> {
        let model = this.getMongooseModel(repoPath);
        // First update the any embedded property and then update the model
        return this.processEmbedding(model, obj).then(result => {
            return Q.nbind(this.getMongooseModel(repoPath).findOneAndUpdate, this.getMongooseModel(repoPath))({ '_id': id }, obj, { upsert: true, new: true })
                .then(result => {
                    this.updateEmbeddedOnEntityChange(model, EntityChange.put, result);
                    return this.toObject(result);
                });
        }).catch(error => {
            console.error(error);
            return Q.reject(error);
        });
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        let model = this.getMongooseModel(repoPath);
        return Q.nbind(this.getMongooseModel(repoPath).findOneAndRemove, this.getMongooseModel(repoPath))({ '_id': id })
            .then((response: any) => {
                if (!response) {
                    return Q.reject('delete failed');
                }
                return this.updateEmbeddedOnEntityChange(model, EntityChange.delete, response);
            });
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        var model = this.getMongooseModel(repoPath);
        // First update the any embedded property and then update the model
        return this.processEmbedding(model, obj).then(result => {
            return this.isDataValid(model, obj, id).then(result => {
                return Q.nbind(this.getMongooseModel(repoPath).findOneAndUpdate, this.getMongooseModel(repoPath))({ '_id': id }, obj, { new: true })
                    .then(result => {
                        this.updateEmbeddedOnEntityChange(model, EntityChange.patch, result);
                        return this.toObject(result);
                    });
            });
        }).catch(error => {
            console.error(error);
            return Q.reject(error);
        });
    }

    patchAllEmbedded(model: Mongoose.Model<any>, prop: string, updateObj: any, entityChange: EntityChange, isEmbedded: boolean, isArray?: boolean): Q.Promise<any> {
        //var compareropWithId = '"' + prop + '._id"';
        //var updateProp = '"' + prop + '._id"';
        if (isEmbedded) {

            var queryCond = {};
            queryCond[prop + '._id'] = updateObj['_id'];

            return Q.nbind(model.find, model)(queryCond)
                .then(updated => {

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
                                var ids = Enumerable.from(updated).select(x => x['_id']).toArray();
                                this.findAndUpdateEmbeddedData(model, ids);
                            });

                    }
                    else {
                        var pullObj = {};
                        pullObj[prop] = {};
                        pullObj[prop]['_id'] = updateObj['_id'];

                        return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                            .then(result => {
                                console.log(result);
                                var ids = Enumerable.from(updated).select(x => x['_id']).toArray();
                                this.findAndUpdateEmbeddedData(model, ids);
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
                    .then(updated => {
                        console.log(cond + ' :count:' + (updated as any[]).length);

                        var pullObj = {};
                        pullObj[prop] = {};

                        if (isArray) {
                            pullObj[prop] = updateObj['_id'];
                            return Q.nbind(model.update, model)({}, { $pull: pullObj }, { multi: true })
                                .then(result => {
                                    console.log(result);
                                    var ids = Enumerable.from(updated).select(x => x['_id']).toArray();
                                    this.findAndUpdateEmbeddedData(model, ids);
                                });
                        }
                        else {
                            pullObj[prop] = null;
                            var cond = {};
                            cond[prop] = updateObj['_id'];

                            return Q.nbind(model.update, model)(cond, { $set: pullObj }, { multi: true })
                                .then(result => {
                                    console.log(result);
                                    var ids = Enumerable.from(updated).select(x => x['_id']).toArray();
                                    this.findAndUpdateEmbeddedData(model, ids);
                                });
                        }
                    });
            }
        }
    }

    isDataValid(model: Mongoose.Model<any>, val: any, id: any) {
        var asyncCalls = [];
        var metas = CoreUtils.getAllRelationsForTargetInternal(GetEntity(model.modelName));
        Enumerable.from(metas).forEach(x => {
            var m: MetaData = x;
            if (val[m.propertyKey]) {
                asyncCalls.push(this.isRelationPropertyValid(model, m, val[m.propertyKey], id));
            }
        });
        return Q.all(asyncCalls);
    }

    isRelationPropertyValid(model: Mongoose.Model<any>, metadata: MetaData, val: any, id: any): Q.Promise<any> {
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
                        return Q.nbind(model.find, model)(this.getQueryCondition(id, queryCond))
                            .then(result => {
                                if (Array.isArray(result) && result.length > 0) {
                                    throw TypeError(model.modelName + ': ' + metadata.propertyKey + ' - ' + 'Invalid relation');
                                }
                            });
                    }
                }
                break;
            case Decorators.MANYTOONE: // for single object
                break;
            case Decorators.ONETOONE: // for single object
                break;
            case Decorators.MANYTOMANY: // for array of objects
                // do nothing
                break;
        }
    }

    getQueryCondition(id: any, cond: any): any {
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

    findAndUpdateEmbeddedData(model: Mongoose.Model<any>, ids: any[]): Q.Promise<any> {
        return Q.nbind(model.find, model)({
            '_id': {
                $in: ids
            }
        }).then(result => {
            // Now update affected documents in embedded records

            var asyncCalls = [];
            Enumerable.from(result).forEach(x => {
                asyncCalls.push(this.updateEmbeddedOnEntityChange(model, EntityChange.patch, x));
            });

            //return Q.allSettled(asyncCalls);
        });
    }

    /**
     * Autogenerate mongodb guid (ObjectId) for the autogenerated fields in the object
     * @param obj
     * throws TypeError if field type is not String, ObjectId or Object
     */
    autogenerateIdsForAutoFields(model: Mongoose.Model<any>, obj: any): void {
        var fieldMetaArr = MetaUtils.getMetaData(GetEntity(model.modelName), Decorators.FIELD);
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

    merge(source, dest) {
        for (var key in source) {
            if (!dest[key] || dest[key] != source[key]) {
                dest[key] = source[key];
            }
        }
    }

    updateEmbeddedOnEntityChange(model: Mongoose.Model<any>, entityChange: EntityChange, obj: any) {
        var allReferencingEntities = CoreUtils.getAllRelationsForTarget(GetEntity(model.modelName));
        var asyncCalls = [];
        Enumerable.from(allReferencingEntities)
            .forEach((x: MetaData) => {
                asyncCalls.push(this.updateEntity(x.target, x.propertyKey, x.propertyType.isArray, obj, (<IAssociationParams>x.params).embedded, entityChange));
            });
        return Q.allSettled(asyncCalls);
    }

    updateEntity(targetModel: Object, propKey: string, targetPropArray: boolean, updatedObject: any, embedded: boolean, entityChange: EntityChange): Q.Promise<any> {
        var targetModelMeta = MetaUtils.getMetaData(targetModel, Decorators.DOCUMENT, null);
        if (!targetModelMeta) {
            throw 'Could not fetch metadata for target object';
        }
        var repoName = (<IDocumentParams>targetModelMeta.params).name;
        var model = GetModel(repoName);
        if (!model) {
            throw 'no repository found for relation';
        }
        return this.patchAllEmbedded(model, propKey, updatedObject, entityChange, embedded, targetPropArray);
    }

    processEmbedding(model: Mongoose.Model<any>, obj: any) {
        var asyncCalls = [];
        for (var prop in obj) {
            var metaArr = MetaUtils.getMetaDataForPropKey(GetEntity(model.modelName), prop);
            var relationDecoratorMeta: [MetaData] = <any>Enumerable.from(metaArr)
                .where((x: MetaData) => CoreUtils.isRelationDecorator(x.decorator))
                .toArray();

            if (!relationDecoratorMeta || relationDecoratorMeta.length == 0) {
                continue;
            }
            if (relationDecoratorMeta.length > 1) {
                throw 'too many relations in single model';
            }
            //var params = <IAssociationParams>relationDecoratorMeta[0].params;
            asyncCalls.push(this.embedChild(obj, prop, relationDecoratorMeta[0]));
            //else if (!params.persist) {
            //    delete obj[prop];
            //    continue;
            //}
        }
        return Q.all(asyncCalls);
    }

    embedChild(obj, prop, relMetadata: MetaData): Q.Promise<any> {
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

        return repo.findMany(this.castAndGetPrimaryKeys(obj, prop, relMetadata))
            .then(result => {
                if (params.embedded) {
                    obj[prop] = obj[prop] instanceof Array ? result : result[0];
                }
                else {
                    // Verified that foriegn keys are correct and now update the Id
                    obj[prop] = obj[prop] instanceof Array ? Enumerable.from(result).select(x => x['_id']).toArray() : result[0]['_id'];
                }
            }).catch(error => {
                console.error(error);
                return Q.reject(error);
            });
    }

    castAndGetPrimaryKeys(obj, prop, relMetaData: MetaData): Array<any> {
        var primaryMetaDataForRelation = CoreUtils.getPrimaryKeyMetadata(relMetaData.target);

        if (!primaryMetaDataForRelation) {
            throw 'primary key not found for relation';
        }

        var primaryType = primaryMetaDataForRelation.propertyType.itemType;
        return obj[prop] instanceof Array
            ? Enumerable.from(obj[prop]).select(x => Utils.castToMongooseType(x, primaryType)).toArray()
            : [Utils.castToMongooseType(obj[prop], primaryType)];
    }

    toObject(result): any {
        if (result instanceof Array) {
            return Enumerable.from(result).select(x => x.toObject()).toArray();
        }
        return result ? result.toObject() : null;
    }

    private getMongooseModel(repoPath: string) {
        try {
            return pathRepoMap[repoPath].mongooseModel;
        } catch (e) {
            throw e;
        }
    }
}