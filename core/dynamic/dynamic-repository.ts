import * as Enumerable from 'linq';
import express = require("express");
var router = express.Router();

import Q = require('q');

import {IEntityService} from "../interfaces/entity-service";
import {Container} from '../../di';
import * as Utils from '../utils';
import {pathRepoMap, getEntity, getModel} from './model-entity';
import {InstanceService} from '../services/instance-service';
import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants';
import {QueryOptions} from '../interfaces/queryOptions';


var modelNameRepoModelMap: { [key: string]: IDynamicRepository } = {};
 
export function GetRepositoryForName(name: string): IDynamicRepository {
    return modelNameRepoModelMap[name]
}

export interface IDynamicRepository {
    getEntity();
    getModel();
    modelName();
    getEntityType(): any;
    getRootRepo(): IDynamicRepository;

    bulkPost(objArr: Array<any>);
    bulkPut(objArr: Array<any>);
    bulkPatch(objArr: Array<any>);
    bulkPutMany(objIds: Array<any>, obj: any);
    bulkDel(objArr: Array<any>);

    findOne(id: any): Q.Promise<any>;
    findMany(ids: Array<any>, toLoadEmbeddedChilds?: boolean): Q.Promise<any>;
    findAll(): Q.Promise<any>;
    //findWhere(query, selectedFields?: Array<any>): Q.Promise<any>;
    findWhere(query, selectedFields?: Array<any>, queryOptions?: QueryOptions): Q.Promise<any>;
    findByField(fieldName, value): Q.Promise<any>;
    findChild(id, prop): Q.Promise<any>;

    put(id: any, obj: any): Q.Promise<any>;
    post(obj: any): Q.Promise<any>;
    delete(id: any);
    patch(id: any, obj);
}

export class DynamicRepository implements IDynamicRepository {
    private path: string;
    private model: any;
    private metaModel: any;
    private entity: any;
    private entityService: IEntityService;
    private rootLevelRep: IDynamicRepository;
    //private modelRepo: any;

    public initialize(repositoryPath: string, target: Function | Object, model?: any, rootRepo?: IDynamicRepository) {
        //console.log(schema);
        this.path = repositoryPath;
        this.entity = target;
        this.rootLevelRep = rootRepo;
        if (target instanceof DynamicRepository) {
            target.rootLevelRep = rootRepo;
        }
        modelNameRepoModelMap[this.path] = this;
    }

    public getEntity() {
        return getEntity(pathRepoMap[this.path].schemaName);
    }

    public getModel() {
        return Utils.entityService(pathRepoMap[this.path].modelType).getModel(pathRepoMap[this.path].schemaName);
    }

    public getRootRepo() {
        return this.rootLevelRep;
    }

    public bulkPost(objArr: Array<any>) {
        var objs = [];
        objArr.forEach(x => {
            objs.push(InstanceService.getInstance(this.getEntity(), null, x));
        });
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkPost(this.path, objs);
    }

    public bulkPut(objArr: Array<any>) {
        var objs = [];
        objArr.forEach(x => {
            objs.push(InstanceService.getInstance(this.getEntity(), null, x));
        });
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkPut(this.path, objs);
    }

    public bulkPatch(objArr: Array<any>) {
        var objs = [];
        objArr.forEach(x => {
            objs.push(InstanceService.getInstance(this.getEntity(), null, x));
        });
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkPatch(this.path, objs);
    }

    public bulkPutMany(objIds: Array<any>, obj: any) {
        obj = InstanceService.getInstance(this.getEntity(), null, obj);
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkPutMany(this.path, objIds, obj);
    }

    public bulkDel(objArr: Array<any>) {
        return Utils.entityService(pathRepoMap[this.path].modelType).bulkDel(this.path, objArr);
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
        return Utils.entityService(pathRepoMap[this.path].modelType).findAll(this.path).then(result => {
            if (result && result.length > 0) {
                var res = [];
                result.forEach(x => {
                    res.push(InstanceService.getObjectFromJson(this.getEntity(), x));
                });
                return res;
            }
            return result;
        });
    }

    // public findWhere(query, selectedFields?: Array<any>): Q.Promise<any> {
    //     return Utils.entityService(pathRepoMap[this.path].modelType).findWhere(this.path, query, selectedFields).then(result => {
    //         if (result && result.length > 0) {
    //             var res = [];
    //             result.forEach(x => {
    //                 res.push(InstanceService.getObjectFromJson(this.getEntity(), x));
    //             });
    //             return res;
    //         }
    //         return result;
    //     });
    // }

    public findWhere(query, selectedFields?: Array<any>, queryOptions?: QueryOptions, toLoadChilds?: boolean): Q.Promise<any> {
        return Utils.entityService(pathRepoMap[this.path].modelType).findWhere(this.path, query, selectedFields,queryOptions, toLoadChilds).then(result => {
            if (result && result.length > 0) {
                var res = [];
                result.forEach(x => {
                    res.push(InstanceService.getObjectFromJson(this.getEntity(), x));
                });
                return res;
            }
            return result;
        });
    }



    public findOne(id) {
        return Utils.entityService(pathRepoMap[this.path].modelType).findOne(this.path, id).then(result => {
            return InstanceService.getObjectFromJson(this.getEntity(), result);
        });
    }

    public findByField(fieldName, value): Q.Promise<any> {
        return Utils.entityService(pathRepoMap[this.path].modelType).findByField(this.path, fieldName, value);
    }

    public findMany(ids: Array<any>, toLoadEmbeddedChilds?: boolean) {
        return Utils.entityService(pathRepoMap[this.path].modelType).findMany(this.path, ids, toLoadEmbeddedChilds).then(result => {
            if (result && result.length > 0) {
                var res = [];
                result.forEach(x => {
                    res.push(InstanceService.getObjectFromJson(this.getEntity(), x));
                });
                return res;
            }
            return result;
        });
    }

    public findChild(id, prop): Q.Promise<any> {
        //check if child model is diffrent from parent model (parent is doc and child is entity)
        //get child repo
        //call parent's find one and get the array of ids
        //return child repo.findmany (ids)

        //var childMeta:string = Utils.getRepoPathForChildIfDifferent(this.getEntity(), prop);
        //if (childMeta)
        //    return this.findOne(id).then(parent => {
        //        var chilldIds = parent[prop];
        //        if (!(chilldIds instanceof Array)) {
        //            chilldIds = [chilldIds];
        //        }
        //        return Utils.entityService(pathRepoMap[childMeta].modelType).findMany(childMeta,chilldIds);
        //    });

        return Utils.entityService(pathRepoMap[this.path].modelType).findChild(this.path, id, prop);
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    public post(obj: any): Q.Promise<any> {
        obj = InstanceService.getInstance(this.getEntity(), null, obj);
        return Utils.entityService(pathRepoMap[this.path].modelType).post(this.path, obj);
    }

    public put(id: any, obj: any) {
        obj = InstanceService.getInstance(this.getEntity(), id, obj);
        return Utils.entityService(pathRepoMap[this.path].modelType).put(this.path, id, obj);
    }
        
    public delete(id: any) {
        return Utils.entityService(pathRepoMap[this.path].modelType).del(this.path, id);
    }

    public patch(id: any, obj) {
        obj = InstanceService.getInstance(this.getEntity(), id, obj);
        return Utils.entityService(pathRepoMap[this.path].modelType).patch(this.path, id, obj);;
    }

}