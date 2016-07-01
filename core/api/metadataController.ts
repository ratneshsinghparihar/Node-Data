/// <reference path="../../security/auth/security-utils.ts" />
import {router} from '../exports';
import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {GetRepositoryForName} from '../dynamic/dynamic-repository';
import {MetaData} from '../metadata/metadata';
import {IAssociationParams} from '../decorators/interfaces';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import * as securityUtils from '../../security/auth/security-utils';

export class MetadataController {
    private path: string;
    private metaData: { [key: string]: any } = <any>{};
    constructor() {
        this.path = "/Metadata";
        this.AddRoutes();
    }

    private AddRoutes() {
        router.get(this.path, securityUtils.ensureLoggedIn(), (req, res) => {
            this.metaData['All'] = this.metaData['All'] ? this.metaData['All'] : this.getAllMetadata(req);
            this.sendresult(req, res, this.metaData['All']);
        });

        router.get(this.path + '/:type', securityUtils.ensureLoggedIn(), (req, res) => {
            this.sendresult(req, res, this.getMetadata(req, req.params.type));
        });
    }

    private sendresult(req, res, result) {
        res.set("Content-Type", "application/json");

        res.send(JSON.stringify(result, null, 4));
    }

    private getAllMetadata(req): any {
        var metaData = {};
        metaData['_links'] = [];

        var names = Utils.getAllResourceNames();
        Enumerable.from(names).forEach(x=> {
            var object = {};
            object['name'] = x;
            object['metadata'] = this.getProtocol(req) + '://' + req.get('host') + this.path + '/' + x;
            metaData['_links'].push(object);
        });

        return metaData;
    }

    private getMetadata(req, type): any {
        
        if (this.metaData[req.params.type])
            return this.metaData[req.params.type];

        var repo = GetRepositoryForName(type);
        if (!repo)
            return null;

        var metas = MetaUtils.getMetaData(repo.getEntityType());
        //var props: { [key: string]: MetaData } = <any>{};
        var props = [];
        var metaData = {};
        var properties = [];
        Enumerable.from(metas).forEach(x=> {
            var m = x as MetaData;
            var params = <IAssociationParams>m.params;
            if ((!props[m.propertyKey] || !params.rel) && m.propertyType.itemType) {
                var info = {};
                info['name'] = m.propertyKey;
                if (params.rel) {
                    var relMeta = this.getProtocol(req) + '://' + req.get('host') + this.path + '/' + params.rel;
                    info['type'] = m.propertyType.isArray ? [relMeta] : relMeta;
                }
                else {
                    info['type'] = m.propertyType.isArray ? [m.propertyType.itemType.name] : m.propertyType.itemType.name;
                }
                properties.push(info);
                props.push(m.propertyKey);
            }
        });
        metaData['id'] = type;
        metaData['properties'] = properties;
        this.metaData[req.params.type] = metaData;
        return this.metaData[req.params.type];
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