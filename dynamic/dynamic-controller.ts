import * as Config from '../config';
//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository, GetRepositoryForName} from './dynamic-repository';
var Reflect = require('reflect-metadata');
export var router = express.Router();
var jwt = require('jsonwebtoken');
import {ISearchPropertyMap, GetAllFindBySearchFromPrototype} from "../decorators/metadata/searchUtils";
import {MetaData} from '../decorators/metadata/metadata';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import  * as SecurityConfig from '../security-config';
import * as Utils from "../decorators/metadata/utils";
import {Decorators} from '../constants/decorators';
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

var Enumerable: linqjs.EnumerableStatic = require('linq');
import {IFieldParams} from '../decorators/interfaces/field-params';

export class DynamicController {
    private repository: DynamicRepository;
    private path: string;

    constructor(path: string, repository: DynamicRepository) {
        this.repository = repository;
        this.path = "/"+Config.Config.basePath + "/" + path;
        //this.addSearchPaths();
        this.addRoutes();
    }

    addRoutes() {
        router.get(this.path,
            Utils.ensureLoggedIn(),
            (req, res) => {

                if (!this.isAuthorize(req, 1))
                    this.sendUnauthorizeError(res, 'unauthorize access for resource ' + this.path);
                return this.repository.findAll()
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
            Utils.ensureLoggedIn(),
            (req, res) => {
                if (!this.isAuthorize(req, 1))
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
            Utils.ensureLoggedIn(),
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
                        var metaData = Utils.getAllRelationalMetaDataForField(this.repository.getEntityType(), req.params.prop);

                        if (metaData != null && metaData.length > 0 &&
                            association !== undefined && association !== null) {

                            var meta = metaData[0]; // by deafult take first relation
                            var repo = GetRepositoryForName(meta.propertyType.rel);
                            if (repo == null) return;

                            var resourceName = this.getFullBaseUrlUsingRepo(req, repo.modelName());

                            if (meta.propertyType.embedded) {
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
            Utils.ensureLoggedIn(),
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
            Utils.ensureLoggedIn(),
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
            Utils.ensureLoggedIn(),
            (req, res) => {
                return this.repository.put(req.params.id, req.body)
                    .then((result) => {
                        this.sendresult(req, res, result);
                    }).catch(error => {
                        console.log(error);
                        this.sendError(res, error);
                    });
            });

        router.delete(this.path + "/:id",
            Utils.ensureLoggedIn(),
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
            Utils.ensureLoggedIn(),
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
        let model = this.repository.getModel();
        let modelRepo = this.repository.getModelRepo();
        let decoratorFields = Utils.getAllMetaDataForDecorator(this.repository.getEntityType(), Decorators.FIELD);
        let fieldsWithSearchIndex = Enumerable.from(decoratorFields).where(ele => {
            return ele.key && decoratorFields[ele.key] && decoratorFields[ele.key].params && (<IFieldParams>decoratorFields[ele.key].params).searchIndex;
        })
            .select(ele => ele.key)
            .toArray();

        let searchPropMap = GetAllFindBySearchFromPrototype(modelRepo);

        let links = { "self": { "href": "/search" } };
        searchPropMap.forEach(map=> {
            this.addRoutesForAllSearch(map, fieldsWithSearchIndex);
            links[map.key] = { "href": "/" + map.key, "params": map.args };
        });
        router.get(this.path + "/search", Utils.ensureLoggedIn(), (req, res) => {
            this.sendresult(req, res, links);
        });
    }

    private addRoutesForAllSearch(map: ISearchPropertyMap, fieldsWithSearchIndex: any[]) {
        let searchFromDb: boolean = true;
        if (Config.Config.ApplyElasticSearch) {
            let areAllSearchFieldsIndexed = Enumerable.from(map.args).intersect(fieldsWithSearchIndex).count() == map.args.length;
            searchFromDb = !areAllSearchFieldsIndexed;
        }

        // If all the search fields are not indexed in the elasticsearch, return data from the database
        // Keeping different router.get to avoid unncessary closure at runtime
        if (searchFromDb) {
            router.get(this.path + "/search/" + map.key, Utils.ensureLoggedIn(),(req, res) => {
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
        var relations: Array<MetaData> =Utils.getAllRelationsForTargetInternal(resourceType);
        
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

    private isAuthorize(req: any, access: number): boolean {
        if (Config.Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.disabled] || Config.Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.enabledWithoutAuthorization])
            return true;
        var isAutherize: boolean = false;
        //check for autherization
        //1. get resource name         
        var resourceName = Utils.getResourceNameFromModel(this.repository.getEntityType())
        //2. get auth config from security config
        var authCofig = Enumerable.from(SecurityConfig.SecurityConfig.ResourceAccess)
            .where((resourceAccess: any) => { return resourceAccess.name == resourceName; })
            .firstOrDefault();
        //if none found then carry on                                     
        if (authCofig) {
                 
            //3. get user object in session
            var userInsession = req.user;
            //4. get roles for current user
                  
            if (!userInsession.rolenames) return false;

            var userRoles: string = userInsession.rolenames;

            var rolesForRead: Array<any> = Enumerable.from(authCofig.acl)
                .where((acl: any) => { return (acl.accessmask & 1) == 1; })
                .toArray();
            //5 match auth config and user roles 
            rolesForRead.forEach(element => {
                if (userRoles.indexOf(element.role) >= 0) {
                    isAutherize = true;
                }


            });
            return isAutherize;
        }

        return true;
    }

    
    private getFullDataUrl(req): string{
        var fullbaseUr:string="";
         fullbaseUr=req.protocol + '://' + req.get('host') + "/" + Config.Config.basePath;
        return fullbaseUr;
    }
    
    private getFullBaseUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    private getFullBaseUrlUsingRepo(req, repoName): string {
        var fullbaseUr: string = "";
        fullbaseUr = req.protocol + '://' + req.get('host') + '/' + Config.Config.basePath + '/' + repoName;
        return fullbaseUr;
    }
}
