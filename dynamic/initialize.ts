import * as Utils from "../decorators/metadata/utils";
import {InitializeRepositories, mongooseRepoMap} from "./initialize-repositories";
import {InitializeControllers} from "./initialize-controllers";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';

var Mongoose = require("mongoose");
var MongooseSchema = Mongoose.Schema;
var Config = require('../config');
var acl=require('acl');
acl = new acl(new acl.mongodbBackend(Config.DbConnection, "acl"));
var SecurityConfig = require('../security-config');

export class Initalize {
    constructor(repositories: Array<Function>) {
        new InitializeRepositories(repositories);
        new InitializeControllers(mongooseRepoMap);
        var mongodb = require('mongodb');
     //   mongodb.connect(Config.DbConnection, function(error, db) {
       //         acl = new acl( new acl.mongodbBackend(db, 'acl'));       
                SecurityConfig.SecurityConfig.ResourceAccess.forEach(resource => {
                resource.acl.forEach(access => {
                             var aclString:Array<string>=this.aclStringFromMask(access["accessmask"]);
                             acl.allow(access["role"],resource["name"],aclString , function(err, res){
                                                            if(res){
                                                                console.log("User joed is allowed to view blogs")
                                                            }
                                                            if(err){
                                                                //console.log("error in acl " + err);
                                                            }
                                                    } )
                                            });
           
                    });
        //});
    }
    
    aclStringFromMask(mask:number):Array<string>{
        var aclString:Array<string>=new Array<string>();
        if((mask & 1)==1) aclString.push("view");
        if((mask & 2)==2) aclString.push("edit");
        if((mask & 4)==4) aclString.push("delete");
        return aclString;
    }
}
