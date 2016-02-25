/// <reference path="../typings/mongoose/mongoose.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/q/Q.d.ts" />
/// <reference path="../typings/linq/linq.3.0.3-Beta4.d.ts" />

var Enumerable: linqjs.EnumerableStatic = require('linq');
var http = require("http");
var express = require("express");
var router = express.Router();

import Q = require('q');
import {Config} from '../config';

import Mongoose = require("mongoose");
Mongoose.connect(Config.DbConnection);
var MongooseSchema = Mongoose.Schema;

import * as MetaUtils from "../decorators/metadata/utils";
import * as Utils from "../utils/utils";
import {MetaData} from '../decorators/metadata/metadata';
import {IAssociationParams} from '../decorators/interfaces/association-params';
import {IFieldParams} from '../decorators/interfaces/field-params';
import {IDocumentParams} from '../decorators/interfaces/document-params';
import {Decorators} from '../constants/decorators';
import {EntityChange} from '../enums/entity-change';

var repoList: { [key: string]: any } = {};
var modelNameRepoModelMap: { [key: string]: IDynamicRepository } = {};

interface IDynamicRepository {
    getModel();
    addRel();
    modelName();
    put(id: any, obj: any): Q.Promise<any>;
    post(obj: any): Q.Promise<any>;
    findOne(id: any): Q.Promise<any>;
    findMany(ids: Array<any>): Q.Promise<any>;
    patchAllEmbedded(prop: string, obj: any, entityChange: EntityChange, embedded: boolean, targetPropArray: boolean): Q.Promise<any>;
}

export class DynamicRepository {
    private path: string;
    private model: Mongoose.Model<any>;
    private metaModel: any;
    private entityType: any;
    private modelRepo: any;

    constructor(repositoryPath: string, fn: Function, schema: any, modelRepo: any) {
        this.path = repositoryPath;
        var modelName = this.path.substring(1);
        this.entityType = fn;
        //this.metaModel=new this.entityType();
        repoList[this.path] = repoList[this.path] || Mongoose.model(repositoryPath, schema);
        this.model = repoList[this.path];
        modelNameRepoModelMap[this.path] = this;
        this.modelRepo = modelRepo;
    }

    public getModelRepo() {
        return this.modelRepo;
    }

    public getModel() {
        return this.model;
    }
    
    

    public addRel() {
        //var user1 = new this.model({"_id": Math.random() + new Date().toString() + this.path + "1", 'name': 'u1' });
        //var user2 = new this.model({ "_id": Math.random() + new Date().toString() + this.path + "2", 'name': 'u2' });
        //this.model.create([user1, user2]).then((msg) => {
        //    console.log(msg);
        //}, (e) => {
        //    console.log(e);
        //});
    }

    public saveObjs(objArr: Array<any>) {
        return this.model.create(objArr).then((msg) => {
            console.log(msg);
        }, (e) => {
            console.log(e);
        });
    }

    public modelName() {
        return this.model.modelName;
    }

    public getEntityType() {
        return this.entityType;
    }

    /**
     * Returns all the items in a collection
     */
    public findAll(): Q.Promise<any> {
        return Q.nbind(this.model.find, this.model)({})
            .then(result => {
                return this.toObject(result);
            });;
    }

    public findWhere(query): Q.Promise<any> {
        return Q.nbind(this.model.find, this.model)(query);
    }

    public findOne(id) {
        return Q.nbind(this.model.findOne, this.model)({ '_id': id })
            .then(result => {
                return this.toObject(result);
            });;
    }

    public findByField(fieldName, value): Q.Promise<any> {
        var param = {};
        param[fieldName] = value;
        return Q.nbind(this.model.findOne, this.model)(param)
            .then(result => {
                return this.toObject(result);
            },
            err => {
                console.error(err);
                return Q.reject(err);
            });
    }

    public findMany(ids: Array<any>) {
        return Q.nbind(this.model.find, this.model)({
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

    public findChild(id, prop) {
        var deferred = Q.defer();
        this.model.findOne({ '_id': id }, (err, res) => {
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
    public post(obj: any): Q.Promise<any> {
        return this.processEmbedding(obj)
            .then(result => {
                try {
                    this.autogenerateIdsForAutoFields(obj);
                } catch (ex) {
                    console.log(ex);
                    return Q.reject(ex);
                }
                return Q.nbind(this.model.create, this.model)(new this.model(obj));
            }).catch(error => {
                console.error(error);
                return Q.reject(error);
            });
    }

    public put(id: any, obj: any) {
        // First update the any embedded property and then update the model
        return this.processEmbedding(obj).then(result=> {
            return Q.nbind(this.model.findOneAndUpdate, this.model)({ '_id': id }, obj, { upsert: true, new: true })
                .then(result => {
                    this.updateEmbeddedOnEntityChange(EntityChange.put, result);
                    return this.toObject(result);
                });
        }).catch(error => {
            console.error(error);
            return Q.reject(error);
        });
    }

    public delete(id: any) {
        return Q.nbind(this.model.findOneAndRemove, this.model)({ '_id': id })
            .then((response: any) => {
                if (!response) {
                    return Q.reject('delete failed');
                }
                return this.updateEmbeddedOnEntityChange(EntityChange.delete, response);
            });
    }

    public patch(id: any, obj) {
        // First update the any embedded property and then update the model
        return this.processEmbedding(obj).then(result=> {
            return Q.nbind(this.model.findOneAndUpdate, this.model)({ '_id': id }, { $set: obj })
                .then(result => {
                    this.updateEmbeddedOnEntityChange(EntityChange.patch, result);
                });
        }).catch(error => {
            console.error(error);
            return Q.reject(error);
        });
    }

    public patchAllEmbedded(prop: string, updateObj: any, entityChange: EntityChange, isEmbedded: boolean, isArray?: boolean) {
        //var compareropWithId = '"' + prop + '._id"';
        //var updateProp = '"' + prop + '._id"';
        if (isEmbedded) {
            
            var queryCond = {};
            queryCond[prop + '._id'] = updateObj['_id'];

            return Q.nbind(this.model.find, this.model)(queryCond)
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

                        return Q.nbind(this.model.update, this.model)(cond, { $set: newUpdateObj }, { multi: true })
                            .then(result => {
                                console.log(result);
                                var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                                this.findAndUpdateEmbeddedData(ids);
                            });
                            
                    }
                    else {
                        var pullObj = {};
                        pullObj[prop] = {};
                        pullObj[prop]['_id'] = updateObj['_id'];

                        return Q.nbind(this.model.update, this.model)({}, { $pull: pullObj }, { multi: true })
                            .then(result => {
                                console.log(result);
                                var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                                this.findAndUpdateEmbeddedData(ids);
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

                return Q.nbind(this.model.find, this.model)(queryCond)
                    .then(updated=> {
                        console.log(cond + ' :count:' + (updated as any[]).length);

                        var pullObj = {};
                        pullObj[prop] = {};

                        if (isArray) {
                            pullObj[prop] = updateObj['_id'];
                            return Q.nbind(this.model.update, this.model)({}, { $pull: pullObj }, { multi: true })
                                .then(result => {
                                    console.log(result);
                                    var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                                    this.findAndUpdateEmbeddedData(ids);
                                });
                        }
                        else {
                            pullObj[prop] = null;
                            var cond = {};
                            cond[prop] = updateObj['_id'];

                            return Q.nbind(this.model.update, this.model)(cond, { $set: pullObj }, { multi: true })
                                .then(result => {
                                    console.log(result);
                                    var ids = Enumerable.from(updated).select(x=> x['_id']).toArray();
                                    this.findAndUpdateEmbeddedData(ids);
                                });
                        }
                    });
            }
        }
    }

    private findAndUpdateEmbeddedData(ids: any[]): Q.Promise<any> {
        return Q.nbind(this.model.find, this.model)({
            '_id': {
                $in: ids
            }
        }).then(result=> {
            // Now update affected documents in embedded records

            var asyncCalls = [];
            Enumerable.from(result).forEach(x=> {
                asyncCalls.push(this.updateEmbeddedOnEntityChange(EntityChange.patch, x));
            });

            //return Q.allSettled(asyncCalls);
        });
    }

    /**
     * Autogenerate mongodb guid (ObjectId) for the autogenerated fields in the object
     * @param obj
     * throws TypeError if field type is not String, ObjectId or Object
     */
    private autogenerateIdsForAutoFields(obj: any): void {
        var fieldMetaArr = MetaUtils.getAllMetaDataForDecorator(this.entityType, Decorators.FIELD);
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
                    throw TypeError(MetaUtils.getModelNameFromObject(this.entityType) + ': ' + metaData.propertyKey + ' - ' + 'Invalid autogenerated type');
                }
            });
    }

    private merge(source, dest) {
        for (var key in source) {
            if (!dest[key] || dest[key] != source[key]) {
                dest[key] = source[key];
            }
        }
    }

    private updateEmbeddedOnEntityChange(entityChange: EntityChange, obj: any) {
        var allReferencingEntities = MetaUtils.getAllRelationsForTarget(this.entityType);
        var asyncCalls = [];
        Enumerable.from(allReferencingEntities)
            .forEach((x: MetaData) => { 
                asyncCalls.push(this.updateEntity(x.target, x.propertyKey, x.propertyType.isArray, obj, (<IAssociationParams>x.params).embedded, entityChange));
            });
        return Q.allSettled(asyncCalls);
    }

    private updateEntity(targetModel: Object, propKey: string, targetPropArray: boolean, updatedObject: any, embedded: boolean, entityChange: EntityChange): Q.Promise<any> {
        var targetModelMeta = MetaUtils.getMetaData(targetModel, Decorators.DOCUMENT);
        if (!targetModelMeta) {
            throw 'Could not fetch metadata for target object';
        }
        var repoName = (<IDocumentParams>targetModelMeta.params).name;
        var repo = this.getRepositoryForName(repoName);
        if (!repo) {
            throw 'no repository found for relation';
        }
        return repo.patchAllEmbedded(propKey, updatedObject, entityChange, embedded, targetPropArray);
    }

    private processEmbedding(obj: any) {
        var asyncCalls = [];
        for (var prop in obj) {
            var metaArr = MetaUtils.getAllMetaDataForField(this.entityType, prop);
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
            asyncCalls.push(this.embedChild(obj, prop, relationDecoratorMeta[0]));
            //else if (!params.persist) {
            //    delete obj[prop];
            //    continue;
            //}
        }
        return Q.all(asyncCalls);
    }

    private embedChild(obj, prop, relMetadata: MetaData): Q.Promise<any> {
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

        var repo = this.getRepositoryForName(params.rel);
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
                    obj[prop] = obj[prop] instanceof Array ? Enumerable.from(result).select(x=> x['_id']).toArray() : result[0]['_id'];
                }
            }).catch(error => {
                console.error(error);
                return Q.reject(error);
            });
    }

    private getRepositoryForName(name) {
        return modelNameRepoModelMap[name]
    }

    private castAndGetPrimaryKeys(obj, prop, relMetaData: MetaData): Array<any> {
        var primaryMetaDataForRelation = MetaUtils.getPrimaryKeyMetadata(relMetaData.target);

        if (!primaryMetaDataForRelation) {
            throw 'primary key not found for relation';
        }

        var primaryType = primaryMetaDataForRelation.propertyType.itemType;
        return obj[prop] instanceof Array
            ? Enumerable.from(obj[prop]).select(x => Utils.castToMongooseType(x, primaryType)).toArray()
            : [Utils.castToMongooseType(obj[prop], primaryType)];
    }


    //private saveChildren(obj: any): Q.Promise<any> {
    //    var asyncCalls = [];
    //    for (var prop in obj) {
    //        var metaArr = MetaUtils.getAllMetaDataForField(this.entityType, prop);
    //        var relationDecoratorMeta = Enumerable.from(metaArr).where((x: MetaUtils.MetaData) => this.isRelationDecorator(x.decorator)).toArray();
    //        if (!relationDecoratorMeta || relationDecoratorMeta.length == 0) {
    //            continue;
    //        }
    //        if (relationDecoratorMeta.length > 1) {
    //            throw 'too many relations in single model';
    //        }
    //        this.saveEmbedded(obj, prop);
    //    }
    //    return Q.allSettled(asyncCalls);
    //}

    //private saveEmbedded(obj, prop) {
    //    var repo = modelNameRepoModelMap[prop];
    //    if (!repo) {
    //        throw 'no repository found for relation';
    //    }
    //    var objArr: Array<any> = obj[prop];
    //    var putAllPromise = this.putAll(Enumerable.from(objArr).where(x => x['_id']).toArray(), repo);
    //    var postAllPromise = this.postAll(Enumerable.from(objArr).where(x => !x['_id']).toArray(), repo);
    //    return Q.allSettled([putAllPromise, postAllPromise])
    //        .then(result => {
    //            console.log(result);
    //        });
    //}

    //private postAll(objArr: Array<any>, repo): Q.Promise<any> {
    //    if (!objArr || !objArr.length) {
    //        return Q.when();
    //    }
    //    var asyncCalls = [];
    //    Enumerable.from(objArr).forEach(x => {
    //        asyncCalls.push(repo.post(x));
    //    });
    //    return Q.allSettled(asyncCalls);
    //}

    //private putAll(objArr: Array<any>, repo): Q.Promise<any> {
    //    if (!objArr || !objArr.length) {
    //        return Q.when();
    //    }
    //    var asyncCalls = [];
    //    Enumerable.from(objArr).forEach(x => {
    //        asyncCalls.push(repo.put(x));
    //    });
    //    return Q.allSettled(asyncCalls);
    //}



    private toObject(result): any {
        if (result instanceof Array) {
            return Enumerable.from(result).select(x => x.toObject()).toArray();
        }
        return result ? result.toObject() : null ;
    }

    //private findNthIndex(str: string, subStr: string, n: number) {
    //    var index = -1;
    //    for (; n > 0; n--) {
    //        index = str.indexOf(subStr, index + 1);
    //        if (n == 1 || index == -1) {
    //            return index;
    //        }
    //    }
    //}
}