/// <reference path="../typings/node/node.d.ts" />

//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository} from './dynamic-repository';
var Reflect = require('reflect-metadata');
export var router = express.Router();
var Config = require('../config');
import * as Utils from "../decorators/metadata/utils";
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {SecurityConfig} from '../security-config';

export class DynamicController {
    private repository: DynamicRepository;
    private path: string;

    constructor(path: string, repository: DynamicRepository) {
        this.repository = repository;
        this.path = path;
        this.addRoutes();
    }

    

    addRoutes() {
        router.get(this.path,
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            
            if(!this.isAuthorize(req,1))                    
            return res.send(401, 'unauthorize access for resource ' + this.path);
            
            return this.repository.findAll()
                .then((result) => {
                    result=this.getHalModels(result,this.repository.modelName());
                    this.sendresult(req, res, result);
                    
                });
        });
        
        router.get(this.path + '/:id',
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {                          
            if(!this.isAuthorize(req,1))                    
            return res.send(401, 'unauthorize access for resource ' + this.path);      
            return this.repository.findOne(req.params.id)
                .then((result) => {
                    this.getHalModel1(result,this.repository.modelName(),this.repository.getEntityType());
                    this.sendresult(req, res, result);
                });
        });

        router.get(this.path + '/:id/:prop',
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            return this.repository.findChild(req.params.id, req.params.prop)
                .then((result) => {
                    //result=this.getHalModel1(result,this.repository.modelName(),this.repository.getEntityType());
                    //var propTypeName = Reflect.getMetadata("design:type", result.toObject()[req.params.prop], req.params.prop);
                    this.getHalModel1(result,this.repository.modelName(),this.repository.getEntityType());
                    
                    var parent=result.toObject();
                    var association=parent[req.params.prop];
                    //var propName=Reflect.getMetadata("design:type", association, req.params.prop);
                   // var resourceName= Reflect.getMetadata("design:type", association);
                    //this.getHalModel(association,req.params.prop);
                    this.sendresult(req, res,association );
                });
        });

        router.post(this.path,
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            this.getModelFromHalModel(req.body);
            return this.repository.post(req.body)
                .then((result) => {
                    this.sendresult(req, res, result);
                },(e) => {
                    console.log(e);
                });;
        });
        
        

        //router.post(this.path + '/:id/:prop/:value', (req, res) => {
        //    return this.sendresult(req, res, req.params);
        //});

        // delete any property value
        router.delete(this.path + "/:id/:prop",
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            return this.sendresult(req, res, req.params);
        });

        // add or update any property value
        router.put(this.path + "/:id",
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            return this.repository.put(req.params.id, req.body)
                .then((result) => {
                    this.sendresult(req, res, result);
                }, (e) => {
                    console.log(e);
                });
        });

        router.delete(this.path + "/:id",
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            return this.repository.delete(req.params.id)
                .then((result) => {
                    this.sendresult(req, res, result);
                });
        });

        router.patch(this.path + "/:id",
        require('connect-ensure-login').ensureLoggedIn(),
         (req, res) => {
            return this.repository.patch(req.params.id, req.body)
                .then((result) => {
                    this.sendresult(req, res, result);
                });
        });

    }

    private getHalModel(model:any,resourceName:string):any{
        var selfUrl={};
        selfUrl["href"]="/"+resourceName+"/"+model._id;
        var selfObjec={};
         selfObjec["self"]=selfUrl;      
        model["_links"]=selfObjec;
        
        return model;
    }
    
    private getModelFromHalModel(model:any)
    {
        if(model["_lniks"])
        {
            delete model["_lniks"];
        }
    }
    
     
    private getHalModel1(model:any,resourceName:string,resourceType:any):any{
        var dbModel=model._doc;
        var entityModel:any =new resourceType(dbModel);
        var selfUrl={};
        selfUrl["href"]="/"+resourceName+"/"+model._doc._id;
        //var selfObjec={};
        // selfObjec["self"]=selfUrl;      
        entityModel["_links"]["self"]=selfUrl;
        model._doc=entityModel;
        return model;
    }    
    
    
    private getHalModels(models: Array<any>,resourceName:string): any{
        var halresult={};
        halresult["_links"]={"self": { "href": "/"+resourceName},"search":{"href":"/search"}};
        models.forEach(model => {
            this.getHalModel(model,resourceName);
        });
        halresult["_embedded"]=models;
        return halresult;
    }

    private sendresult(req, res, result) {
        res.set("Content-Type", "application/json");
        
        res.send(JSON.stringify(result,null,4));
    }
    
    private isAuthorize(req:any, access: number):boolean
    {
        if(!Config.isAutheticationEnabled)
        return true; 
        var isAutherize:boolean=false;
        //check for autherization
             //1. get resource name
             var resourceName=Utils.getResourceNameFromModelname(this.repository.getEntityType().name)
             //2. get auth config from security config
             var authCofig=Enumerable.from(SecurityConfig.ResourceAccess)
                                     .where((resourceAccess:any) => {return resourceAccess.name==resourceName ;}  )
                                     .firstOrDefault();
             //if none found then carry on                                     
             if(authCofig)
             {
                 
                  //3. get user object in session
                 var userInsession=req.user;
                  //4. get roles for current user
                  
                  if(!userInsession._doc.rolenames) return false;
                  
                  var userRoles:string=userInsession._doc.rolenames;
                 
                 var rolesForRead:Array<any>=Enumerable.from(authCofig.acl)
                                     .where((acl:any) => {return (acl.accessmask & 1)==1  ;})
                                     .toArray();
                 //5 match auth config and user roles 
                 rolesForRead.forEach(element => {
                     if( userRoles.indexOf(element.role) >= 0){
                                isAutherize=true;
                            }                   
                    
                       
                 });
                 return   isAutherize;
             }  
                 
                 return true;                    
    }
    
}