import {InitializeRepositories} from "./initialize-repositories";
import {InitializeControllers} from "./initialize-controllers";
import {ParamTypeCustom} from '../metadata/param-type-custom';
import {router} from '../exports';
import path = require('path');
import * as Enumerable from 'linq';

import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";

export class Initalize {
    constructor(files: Array<String>) {
        new InitializeRepositories();
        new InitializeControllers();
        //this.configureAcl();
        this.configureBase();
    }

    configureBase() {
        var path = Utils.config().Config.basePath.indexOf('/') === 0 ? Utils.config().Config.basePath : '/' + Utils.config().Config.basePath;
        router.get(path,
            (req, res) => {
                //fetch all resources name (not the model name) in an array
                var allresourcesNames: Array<string> = Utils.getAllResourceNames();
                var allresourceJson = [];
                var fullbaseUrl: string = "";
                fullbaseUrl = this.getProtocol(req) + '://' + req.get('host') + req.originalUrl;
                allresourcesNames.forEach(resource => {
                    var resoucejson = {};
                    resoucejson[resource] = fullbaseUrl + (resource[0] === '/' ? resource : '/' + resource);//+ tokenUrl;
                    allresourceJson.push(resoucejson);
                });
                //loop through rsources and push in json array with name as key and url as value
                res.set("Content-Type", "application/json");

                res.send(JSON.stringify(allresourceJson, null, 4));
            }
        )
    }

    configureAcl() {
        var acl = require('acl');
        acl = new acl(new acl.mongodbBackend(Utils.config().Config.DbConnection, "acl"));        

        Utils.securityConfig().SecurityConfig.ResourceAccess.forEach(resource => {
            resource.acl.forEach(access => {
                var aclString: Array<string> = this.aclStringFromMask(access["accessmask"]);
                acl.allow(access["role"], resource["name"], aclString, function (err, res) {
                    if (res) {
                        console.log("User joed is allowed to view blogs")
                    }
                    if (err) {
                        //console.log("error in acl " + err);
                    }
                })
            });

        });
    }

    aclStringFromMask(mask: number): Array<string> {
        var aclString: Array<string> = new Array<string>();
        if ((mask & 1) == 1) aclString.push("view");
        if ((mask & 2) == 2) aclString.push("edit");
        if ((mask & 4) == 4) aclString.push("delete");
        return aclString;
    }

    private getProtocol(req) : string{
        if(req.headers && req.headers["x-arr-ssl"]){
            return "https";
        }
        else{
            return req.protocol;
        }
    }

}