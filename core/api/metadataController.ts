/// <reference path="../../security/auth/security-utils.ts" />
import {router} from '../exports';
import {MetaUtils} from "../metadata/utils";
import {DecoratorType} from '../enums';
import * as Utils from "../utils";
import {GetRepositoryForName} from '../dynamic/dynamic-repository';
import {MetaData} from '../metadata/metadata';
import {IAssociationParams} from '../decorators/interfaces';
import * as Enumerable from 'linq';
import * as securityUtils from '../../security/auth/security-utils';

export interface metaDataObject {
    id?: string;
    type?: string;
    properties?: Array<metaDataInnerObject>
}

export interface metaDataInnerObject {
    name?: string;
    type?: string; //"string","number","date","Object","Array"
    subtype?: string;
    metadata?: metaDataObject
    pathFromRoot?: Array<any>
}


export interface metaDataMapping {
    from: metaDataObject;
    to: metaDataObject;
    type?: string; // "data" default , "name"
    innerMapping?: Array<metaDataMapping>
}

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

    public getMetadata(req, type): any {
        
        if (this.metaData[type])
            return this.metaData[type];
        var baseRelMeta = this.getProtocol(req) + '://' + req.get('host') + this.path + '/'
        var metadata:any = MetaUtils.getDescriptiveMetadata(type, baseRelMeta);
        this.metaData[type] = metadata;
        return metadata;
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

export default MetadataController;
