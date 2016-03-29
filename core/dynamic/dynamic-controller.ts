/// <reference path="../../security/auth/security-utils.ts" />
/// <reference path="../constants/decorators.ts" />
import * as configUtil from '../utils';
//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository, GetRepositoryForName} from './dynamic-repository';
var Reflect = require('reflect-metadata');
import {router} from '../exports';
var jwt = require('jsonwebtoken');
import {ISearchPropertyMap, GetAllFindBySearchFromPrototype} from "../metadata/searchUtils";
import {IActionPropertyMap, GetAllActionFromPrototype} from "../metadata/actionUtils";
import {MetaData} from '../metadata/metadata';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import  * as SecurityConfig from '../../security-config';
import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {Decorators} from '../constants/decorators';
import {IAssociationParams} from '../decorators/interfaces';
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
import * as securityUtils from '../../security/auth/security-utils';

var Enumerable: linqjs.EnumerableStatic = require('linq');

export class DynamicController {
    private repository: DynamicRepository;
    private path: string;

    constructor(path: string, repository: DynamicRepository) {
        this.repository = repository;
        this.path = "/" + Utils.config().Config.basePath + "/" + path;
        this.addSearchPaths();
        this.addActionPaths();
        this.addRoutes();
    }

    addRoutes() {
        console.log(this.path);
        router.get(this.path,
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                    
                if (!securityUtils.isAuthorize(req, 1, 'findAll'))
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                var promise = this.repository.findAll();
                return promise
                    .then((result) => {
                        var resourceName= this.getFullBaseUrl(req);// + this.repository.modelName();
                        result = this.getHalModels(result,resourceName);
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.get(this.path + '/:id',
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                if (!securityUtils.isAuthorize(req, 1,'findOne'))
                    this.sendUnauthorizeError( res, 'unauthorize access for resource ' + this.path);
                return this.repository.findOne(req.params.id)
                    .then((result) => {
                        var resourceName= this.getFullBaseUrl(req);// + this.repository.modelName();
                        this.getHalModel1(result,resourceName , this.repository.getEntityType());
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });
        
        router.get(this.path + '/:id/:prop',
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                return this.repository.findChild(req.params.id, req.params.prop)
                    .then((result) => {
                        //result=this.getHalModel1(result,this.repository.modelName(),this.repository.getEntityType());
                        //var propTypeName = Reflect.getMetadata("design:type", result.toObject()[req.params.prop], req.params.prop);

                        //1. embedded
                        //2. foreign key
                        ///1. get metadata for thsi prop
                        ///2. get moongoose model from metadata
                        ///3. call findAll 
                        ///4 return object or array of object
                        
                        //var propName=Reflect.getMetadata("design:type", association, req.params.prop);
                        // var resourceName= Reflect.getMetadata("design:type", association);
                        //this.getHalModel(association,req.params.prop);
                        //this.getHalModel1(association, this.repository.modelName(), this.repository.getEntityType());
                        //this.sendresult(req, res, association);

                        var parent = (<any>result).toObject();
                        var association = parent[req.params.prop];
                        var metaData = MetaUtils.getMetaDataForPropKey(this.repository.getEntityType(), req.params.prop);

                        if (metaData != null && metaData.length > 0 &&
                            association !== undefined && association !== null) {

                            var meta = metaData[0]; // by deafult take first relation
                            var params = <IAssociationParams>meta.params;
                            var repo = GetRepositoryForName(params.rel);
                            if (repo == null) return;

                            var resourceName = this.getFullBaseUrlUsingRepo(req, repo.modelName());

                            if (params.embedded) {
                                if (meta.propertyType.isArray) {
                                    Enumerable.from(association).forEach(x=> {
                                        this.getHalModel1(x, resourceName + '/' + x['_id'], repo.getEntityType());
                                    });
                                    association = this.getHalModels(association, resourceName);
                                }
                                else {
                                    this.getHalModel1(association, resourceName + '/' + association['_id'], repo.getEntityType());
                                }
                                this.sendresult(req, res, association);
                            }
                            else {
                                var ids = association;
                                if (!meta.propertyType.isArray) {
                                    ids = [association];
                                }

                                return repo.findMany(ids)
                                    .then((result) => {
                                        if (result.length > 0) {
                                            if (meta.propertyType.isArray) {
                                                Enumerable.from(result).forEach(x=> {
                                                    this.getHalModel1(x, resourceName + '/' + x['_id'], repo.getEntityType());
                                                });

                                                result = this.getHalModels(result, resourceName);
                                            }
                                            else {
                                                result = result[0];
                                                this.getHalModel1(result, resourceName + '/' + result['_id'], repo.getEntityType());
                                            }
                                            this.sendresult(req, res, result);
                                        }
                                    });
                            }
                        }
                        else {
                            this.sendresult(req, res, association);
                        }
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.post(this.path,
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                this.getModelFromHalModel(req.body);
                return this.repository.post(req.body)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });
        
        

        //router.post(this.path + '/:id/:prop/:value', (req, res) => {
        //    return this.sendresult(req, res, req.params);
        //});

        // delete any property value
        router.delete(this.path + "/:id/:prop",
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                return this.repository.delete(req.params.id)
                    .then(result => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        // add or update any property value
        router.put(this.path + "/:id",
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                return this.repository.put(req.params.id, req.body)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        // add or update any property value
        router.put(this.path,
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                if (!Array.isArray(req.body)) {
                    this.sendError(res, 'Invalid data.');
                    return;
                }

                return this.repository.saveObjs(req.body as Array<any>)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.delete(this.path + "/:id",
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                return this.repository.delete(req.params.id)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.patch(this.path + "/:id",
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                return this.repository.patch(req.params.id, req.body)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

    }

    addSearchPaths() {
        let modelRepo = this.repository.getEntityType();
        let decoratorFields = MetaUtils.getMetaData(modelRepo.model.prototype, Decorators.FIELD);
        let fieldsWithSearchIndex =
            Enumerable.from(decoratorFields)
                .where(ele => {
                    return ele.key
                        && decoratorFields[ele.key]
                        && decoratorFields[ele.key].params
                        && (<any>decoratorFields[ele.key].params).searchIndex;
                }).toArray();

        let searchPropMap = GetAllFindBySearchFromPrototype(modelRepo);

        var search = {};
        searchPropMap.forEach(map=> {
            this.addRoutesForAllSearch(map, fieldsWithSearchIndex);
            search[map.key] = { "href": map.key, "params": map.args };
        });
        router.get(this.path + "/search", securityUtils.ensureLoggedIn(), (req, res) => {
            let links = { "self": { "href": this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/search" } };
            for (var prop in search) {
                search[prop]["href"] = this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/search/" + search[prop]["href"];
                links[prop] = search[prop];
            }
            this.sendresult(req, res, links);
        });
    }

    addActionPaths() {
        let modelRepo = this.repository.getEntityType();
        let decoratorFields = MetaUtils.getMetaData(modelRepo.model.prototype, Decorators.FIELD);
        let fieldsWithSearchIndex =
            Enumerable.from(decoratorFields)
                .where(ele => {
                    return ele.key
                        && decoratorFields[ele.key]
                        && decoratorFields[ele.key].params
                        && (<any>decoratorFields[ele.key].params).searchIndex;
                }).toArray();

        let searchPropMap = GetAllActionFromPrototype(modelRepo) as Array<IActionPropertyMap>;

        var actions = {};
        searchPropMap.forEach(map => {
            router.post(this.path + "/action/" + map.key, (req, res) => {
                try {
                    let modelRepo = this.repository.getEntityType();
                    var param = [];
                    for (var prop in req.body) {
                        param.push(req.body[prop]);
                    }
                    modelRepo[map.key].apply(modelRepo, param);
                    this.sendresult(req, res, 'success');
                }
                catch (err) {
                    this.sendError(res, err);
                }
            });
            actions[map.key] = { "href": map.key, "params": map.args };
        });
        router.get(this.path + "/action", securityUtils.ensureLoggedIn(), (req, res) => {
            let links = { "self": { "href": this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/action" } };
            for (var prop in actions) {
                actions[prop]["href"] = this.getFullBaseUrlUsingRepo(req, this.repository.modelName()) + "/action/" + actions[prop]["href"];
                links[prop] = actions[prop];
            }
            this.sendresult(req, res, links);
        });
    }

    private addRoutesForAllSearch(map: ISearchPropertyMap, fieldsWithSearchIndex: any[]) {
        let searchFromDb: boolean = true;
        if (configUtil.config().Config.ApplyElasticSearch) {
            let areAllSearchFieldsIndexed = Enumerable.from(map.args).intersect(fieldsWithSearchIndex).count() == map.args.length;
            searchFromDb = !areAllSearchFieldsIndexed;
        }

        // If all the search fields are not indexed in the elasticsearch, return data from the database
        // Keeping different router.get to avoid unncessary closure at runtime
        if (searchFromDb) {
            router.get(this.path + "/search/" + map.key, securityUtils.ensureLoggedIn(),(req, res) => {
                var queryObj = req.query;
                console.log("Querying Database");
                return this.repository
                    .findWhere(queryObj)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    });

            });
        }
        else { // Search from elasticsearch
            let model: any = this.repository.getModel();
            router.get(this.path + "/search/" + map.key, (req, res) => {
                let queryObj = req.query;
                let musts = map.args.map(function(arg) {
                    let s = '{"' + arg + '":' + "0" + "}";
                    let obj = JSON.parse(s);
                    obj[arg] = queryObj[arg];
                    return { "match": obj };
                });
                let query = {
                    "query": {
                        "bool": {
                            "must":
                            musts
                        }
                    }
                };
                console.log("Querying Elastic search with %s", JSON.stringify(query));
                return model
                    .search(query, (err, rr) => {
                        if (err) {
                            console.error(err);
                            this.sendresult(req, res, err);
                        }
                        else {
                            console.log(rr);
                            this.sendresult(req, res, rr);
                        }
                    });
            });
        }
    }


    private getHalModel(model: any, resourceName: string): any {
        var selfUrl = {};
        selfUrl["href"] = resourceName + "/" + model._id;
        var selfObjec = {};
        selfObjec["self"] = selfUrl;
        model["_links"] = selfObjec;

        return model;
    }

    private getModelFromHalModel(model: any) {
        if (model["_lniks"]) {
            delete model["_lniks"];
        }
    }

    private getHalModel1(model: any, resourceName: string, resourceType: any): any {
        var selfUrl = {};
        selfUrl["href"] = resourceName ;// + "/" + model._id;
        model["_links"]={};
        model["_links"]["self"]=selfUrl;
        
        //add associations 
        //read metadata and get all relations names
        var relations: Array<MetaData> = Utils.getAllRelationsForTargetInternal(resourceType);
        
        relations.forEach(relation => {
            if(relation.propertyKey)
            {
                var relUrl={};
                relUrl["href"] = resourceName+"/"+relation.propertyKey;
                model["_links"][relation.propertyKey]=relUrl;
            }
            
        });
        
        //loop through relation names and add into model["_links"]
        
        return model;
        
        // var dbModel = model;
        // var entityModel: any = new resourceType(dbModel);
       
        // //var selfObjec={};
        // // selfObjec["self"]=selfUrl;      
        // entityModel["_links"]["self"] = selfUrl;
        // model = entityModel;
        // return model;
    }


    private getHalModels(models: Array<any>, resourceName: string): any {
        var halresult = {};
        halresult["_links"] = { "self": { "href":  resourceName }, "search": { "href": "/search" } };
        models.forEach(model => {
            this.getHalModel(model, resourceName);
        });
        halresult["_embedded"] = models;
        return halresult;
    }

    private sendUnauthorizeError(res, error) {
        res.set("Content-Type", "application/json");
        res.send(401, JSON.stringify(error, null, 4));
    }

    private sendError(res, error) {
        res.set("Content-Type", "application/json");
        res.send(500, JSON.stringify(error, null, 4));
    }

    private sendresult(req, res, result) {
        res.set("Content-Type", "application/json");
        res.send(JSON.stringify(result, null, 4));
    }

    private presentInArray(key: string, roleArray: Array<string>) {
        var isAvailable = Enumerable.from(roleArray)
            .where(role => role.name == key)
            .firstOrDefault(null);
        if (isAvailable) {
            return true;
        } else {
            return false;
        }
    }
    
    private getFullDataUrl(req): string{
        var fullbaseUr:string="";
         fullbaseUr=req.protocol + '://' + req.get('host') + "/" + configUtil.config().Config.basePath;
        return fullbaseUr;
    }

    private getFullBaseUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    private getFullBaseUrlUsingRepo(req, repoName): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + '/' + configUtil.config().Config.basePath + '/' + repoName;
        return fullbaseUr;
    }
}
