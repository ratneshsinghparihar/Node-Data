var Enumerable: linqjs.EnumerableStatic = require('linq');
import express = require("express");
var router = express.Router();

import Q = require('q');
import Mongoose = require("mongoose");

import {UserRoleService} from '../services/userrole-service';
import * as ModelHelper from "../dynamic/model-helper";
import {Container} from '../di';
import {searchUtils} from "../search/elasticSearchUtils";
import * as Utils from "../decorators/metadata/utils";
import {Decorators} from '../constants/decorators';
import {IAuthorizeParams} from '../decorators/interfaces/authorization-params';

var modelNameRepoModelMap: { [key: string]: IDynamicRepository } = {};
 
export function GetRepositoryForName(name: string): IDynamicRepository {
    return modelNameRepoModelMap[name]
}

export interface IDynamicRepository {
    getModel();
    addRel();
    modelName();
    put(id: any, obj: any): Q.Promise<any>;
    post(obj: any): Q.Promise<any>;
    findOne(id: any): Q.Promise<any>;
    findMany(ids: Array<any>): Q.Promise<any>;
    getEntityType() : any;
}

export class DynamicRepository implements IDynamicRepository {
    private path: string;
    private model: Mongoose.Model<any>;
    private metaModel: any;
    private entityType: any;
    private modelRepo: any;

    constructor(repositoryPath: string, fn: Function, model: any, modelRepo: any) {
        //console.log(schema);
        this.path = repositoryPath;
        var modelName = this.path.substring(1);
        this.entityType = fn;
        //this.metaModel=new this.entityType();
        this.model = model;
        console.log(this.model.schema);
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
        return ModelHelper.saveObjs(this.model, objArr);
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
        return ModelHelper.findAll(this.model);
    }

    public findWhere(query): Q.Promise<any> {
        return ModelHelper.findWhere(this.model, query);
    }

    public findOne(id) {
        return ModelHelper.findOne(this.model, id);
    }

    public findByField(fieldName, value): Q.Promise<any> {
        return ModelHelper.findByField(this.model, fieldName, value);
    }

    public findMany(ids: Array<any>) {
        return ModelHelper.findMany(this.model, ids);
    }

    public findChild(id, prop) {
        return ModelHelper.findChild(this.model, id, prop);
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    public post(obj: any): Q.Promise<any> {
        return ModelHelper.post(this.model, obj);
    }

    public put(id: any, obj: any) {
        return ModelHelper.put(this.model, id, obj);
    }

    public delete(id: any) {
        return ModelHelper.del(this.model, id);
    }

    public patch(id: any, obj) {
        return ModelHelper.patch(this.model, id, obj);;
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