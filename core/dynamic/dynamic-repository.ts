var Enumerable: linqjs.EnumerableStatic = require('linq');
import express = require("express");
var router = express.Router();

import Q = require('q');

import {IEntityService} from "../interfaces/entity-service";
import {Container} from '../../di';
import * as Utils from '../utils';
import {pathRepoMap, getEntity, getModel} from './model-entity';
import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants';

var modelNameRepoModelMap: { [key: string]: IDynamicRepository } = {};
 
export function GetRepositoryForName(name: string): IDynamicRepository {
    return modelNameRepoModelMap[name]
}

export interface IDynamicRepository {
    getEntity();
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
    private model: any;
    private metaModel: any;
    private entity: any;
    private entityService: IEntityService;
    //private modelRepo: any;

    constructor(repositoryPath: string, target: Function | Object, model?: any) {
        //console.log(schema);
        this.path = repositoryPath;
       // this.schemaName = this.path;
        this.entity = target;
        //this.metaModel=new this.entityType();
        //this.model = model;
        //console.log(this.fn.schema);
        modelNameRepoModelMap[this.path] = this;
        //var metaForEntityModel = [];
        //try {
        //    metaForEntityModel = MetaUtils.getMetaData(model, Decorators.ENTITY);
        //} catch (exception) { }
        //if (metaForEntityModel && metaForEntityModel != null && metaForEntityModel.length>0)
        //    this.entityService = Utils.sqlEntityService();
        //else
        //    this.entityService = Utils.entityService();
    }

    public getEntity() {
        return getEntity(pathRepoMap[this.path].schemaName);
    }

    public getModel() {
        return getModel(pathRepoMap[this.path].schemaName);
    }

    public bulkPost(objArr: Array<any>) {
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkPost(this.path, objArr);
    }

    public bulkPut(objArr: Array<any>) {
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkPut(this.path, objArr);
    }

    public modelName() {
        return this.path;
    }

    public getEntityType() {
        return this.entity;
    }

    /**
     * Returns all the items in a collection
     */
    public findAll(): Q.Promise<any> {
        return Utils.entityService(pathRepoMap[this.path].modelType).findAll(this.path);
    }

    public findWhere(query): Q.Promise<any> {
        return Utils.entityService(pathRepoMap[this.path].modelType).findWhere(this.path, query);
    }

    public findOne(id) {
        return Utils.entityService(pathRepoMap[this.path].modelType).findOne(this.path, id);
    }

    public findByField(fieldName, value): Q.Promise<any> {
        return Utils.entityService(pathRepoMap[this.path].modelType).findByField(this.path, fieldName, value);
    }

    public findMany(ids: Array<any>) {
        return Utils.entityService(pathRepoMap[this.path].modelType).findMany(this.path, ids);
    }

    public findChild(id, prop): Q.Promise<any> {
        //check if child model is diffrent from parent model (parent is doc and child is entity)
        //get child repo
        //call parent's find one and get the array of ids
        //return child repo.findmany (ids)

        var childMeta:string = Utils.getRepoPathForChildIfDifferent(this.getEntity(), prop);
        if (childMeta)
            return this.findOne(id).then(parent => {
                var chilldIds = parent[prop];
                if (!(chilldIds instanceof Array)) {
                    chilldIds = [chilldIds];
                }
                return Utils.entityService(pathRepoMap[childMeta].modelType).findMany(childMeta,chilldIds);
            });

        return Utils.entityService(pathRepoMap[this.path].modelType).findChild(this.path, id, prop);
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    public post(obj: any): Q.Promise<any> {
        return Utils.entityService(pathRepoMap[this.path].modelType).post(this.path, obj);
    }

    public put(id: any, obj: any) {
        return Utils.entityService(pathRepoMap[this.path].modelType).put(this.path, id, obj);
    }

    public delete(id: any) {
        return Utils.entityService(pathRepoMap[this.path].modelType).del(this.path, id);
    }

    public patch(id: any, obj) {
        return Utils.entityService(pathRepoMap[this.path].modelType).patch(this.path, id, obj);;
    }

    public addRel() {
    }
}