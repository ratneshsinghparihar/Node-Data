var Enumerable: linqjs.EnumerableStatic = require('linq');
import express = require("express");
var router = express.Router();

import Q = require('q');

import {IEntityService} from "../interfaces/entity-service";
import {Container} from '../../di';
import * as Utils from '../utils';
import {getEntity, getModel} from './model-entity';

var modelNameRepoModelMap: { [key: string]: IDynamicRepository } = {};
 
export function GetRepositoryForName(name: string): IDynamicRepository {
    return modelNameRepoModelMap[name]
}

export interface IDynamicRepository {
    getModelRepo();
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
    //private model: Mongoose.Model<any>;
    private metaModel: any;
    private entity: any;
    private schemaName: string;
    //private modelRepo: any;

    constructor(repositoryPath: string, target: Function|Object) {
        //console.log(schema);
        this.path = repositoryPath;
        this.schemaName = this.path.substring(1) as string;
        this.entity = target;
        //this.metaModel=new this.entityType();
        //this.model = model;
        //console.log(this.fn.schema);
        modelNameRepoModelMap[this.path] = this;
        //this.modelRepo = modelRepo;
    }

    public getModelRepo() {
        return getEntity(this.path);
    }

    public getModel() {
        return getModel(this.path);
    }

    public saveObjs(objArr: Array<any>) {
        return Utils.entityService().saveObjs(this.path, objArr);
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
        return Utils.entityService().findAll(this.path);
    }

    public findWhere(query): Q.Promise<any> {
        return Utils.entityService().findWhere(this.path, query);
    }

    public findOne(id) {
        return Utils.entityService().findOne(this.path, id);
    }

    public findByField(fieldName, value): Q.Promise<any> {
        return Utils.entityService().findByField(this.path, fieldName, value);
    }

    public findMany(ids: Array<any>) {
        return Utils.entityService().findMany(this.path, ids);
    }

    public findChild(id, prop) {
        return Utils.entityService().findChild(this.path, id, prop);
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    public post(obj: any): Q.Promise<any> {
        return Utils.entityService().post(this.path, obj);
    }

    public put(id: any, obj: any) {
        return Utils.entityService().put(this.path, id, obj);
    }

    public delete(id: any) {
        return Utils.entityService().del(this.path, id);
    }

    public patch(id: any, obj) {
        return Utils.entityService().patch(this.path, id, obj);;
    }

    public addRel() {
    }
}