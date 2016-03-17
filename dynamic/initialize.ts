import {InitializeRepositories} from "./initialize-repositories";
import {InitializeControllers} from "./initialize-controllers";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';
import {Decorators} from '../constants';
import * as metaUtils from "../decorators/metadata/utils";
import {MetaData} from '../decorators/metadata/metadata';
import {IAssociationParams} from '../decorators/interfaces/meta-params';
import path = require('path');
var Enumerable: linqjs.EnumerableStatic = require('linq');

import * as Utils from '../utils';

export class Initalize {
    constructor(files: Array<String>) {
        //this.validateModels();
        new InitializeRepositories();
        new InitializeControllers();
        this.configureAcl();
    }

    configureAcl() {
        var acl = require('acl');
        acl = new acl(new acl.mongodbBackend(Utils.config().Config.DbConnection, "acl"));
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

    // need to pass this via reference
    private visitedNodes = new Map();

    validateModels() {
        var modelsMeta = metaUtils.getMetaDataForDecoratorInAllTargets(Decorators.DOCUMENT);
        Enumerable.from(modelsMeta).forEach(x => {
            var m: MetaData = x;
            var res = this.hasLoop(m.target, new Array<MetaData>());
            if (res) {
                throw 'Cannot start server. Please correct the model ' + m.target.constructor.name;
            }
        });
    }

    hasLoop(target: Object, vis: Array<MetaData>): boolean {
        var rel = metaUtils.getAllRelationsForTargetInternal(target);
        Enumerable.from(rel).forEach(y => {
            var r: MetaData = <MetaData>y;
            var param: IAssociationParams = <IAssociationParams>r.params;
            if (param.embedded || param.eagerLoading) {
                var res = false;
                if (this.visitedNodes.has(r)) {
                    // no need to go ahead, path from this node is already checked
                    res = false;
                }
                else if (vis.indexOf(r) > -1) {
                    // loop found
                    res = true;
                }
                else {
                    vis.push(r);
                    this.visitedNodes.set(r, true);
                    res = this.hasLoop(param.itemType, vis);
                }

                // if any loop 
                if (res)
                    return true;
            }
        });

        return false;
    }
}