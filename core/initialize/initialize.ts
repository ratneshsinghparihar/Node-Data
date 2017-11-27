/// <reference path="initialize-scokets.ts" />
import {InitializeRepositories} from "./initialize-repositories";
import {InitializeScokets} from "./initialize-scokets";
import {InitializeMessengers} from "./initialize-messengers";
import {InitializeControllers} from "./initialize-controllers";
import {ParamTypeCustom} from '../metadata/param-type-custom';
import {router} from '../exports';
import path = require('path');
import * as Enumerable from 'linq';
import Q = require('q');
import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {CrudEntity} from "../dynamic/crud.entity";

export class Initalize {
    constructor(files: Array<String>, server?: any) {
        new InitializeRepositories();        
        new InitializeMessengers();
        new InitializeScokets(server);
        new InitializeControllers();
       
        this.configureBase();
        ['bulkPost', 'bulkPut', 'bulkPatch', 'bulkDel'].forEach(x => {
            Object.defineProperty(Array.prototype, x, {
                enumerable: false,
                writable: false,
                value: this.getExtendedArrayMethod(x)
            });
        });
    }

    getExtendedArrayMethod(action: string): () => Q.Promise<any> {
        return (function () {
            let curArr = this;
            if (!curArr[0]) {
                return Q.when([]);
            }
            let repo = (<CrudEntity>(curArr[0])).getRepo();
            if (!repo) {
                return Q.reject("repository not found");
            }
            return repo[action]([].concat(curArr));
        });
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

    

    private getProtocol(req) : string{
        if(req.headers && req.headers["x-arr-ssl"]){
            return "https";
        }
        else{
            return req.protocol;
        }
    }

}