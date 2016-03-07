import {InitializeRepositories, mongooseRepoMap} from "./initialize-repositories";
import {InitializeControllers} from "./initialize-controllers";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';
import path = require('path');
var Enumerable: linqjs.EnumerableStatic = require('linq');

import * as Utils from '../utils';

export class Initalize {
    constructor(files: Array<String>) {
        new InitializeRepositories();
        new InitializeControllers(mongooseRepoMap);
        this.configureAcl();
    }

    configureAcl() {
        var acl = require('acl');
        acl = new acl(new acl.mongodbBackend(Utils.config().DbConnection, "acl"));
        var SecurityConfig = require('../security-config');

        SecurityConfig.SecurityConfig.ResourceAccess.forEach(resource => {
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
}