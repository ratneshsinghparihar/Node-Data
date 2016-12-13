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

    private getMetadata(req, type,recursionLevel?:number): any {
        
        if (this.metaData[type] && !recursionLevel)
            return this.metaData[type];

        var metas;

        metas = MetaUtils.getMetaDataFromType(type);

        if (!metas) {

            var repo = GetRepositoryForName(type);
            if (!repo)
                return undefined;


            if (repo) {
                metas = MetaUtils.getMetaData(repo.getEntity());
            }
        }
        

        //var props: { [key: string]: MetaData } = <any>{};
        
        var metaData = {};
       
        var properties = [];
        Enumerable.from(metas).forEach(x=> {
            var m = x as MetaData;
            if (m.decoratorType == DecoratorType.PROPERTY) {
                var params: IAssociationParams = <IAssociationParams>m.params;
                var info = {};
                info['name'] = m.propertyKey;
                if (params && params.rel) {
                    var relMeta = this.getProtocol(req) + '://' + req.get('host') + this.path + '/' + m.getType().name;
                    info['subtype'] = m.getType().name;
                    info['type'] = m.propertyType.isArray ? "Array" : "Object";

                    info['href'] = relMeta;
                    if (!recursionLevel) {
                        info['metadata'] = this.getMetadata(req, (<any>params.itemType).name, 1);
                        recursionLevel = undefined;
                    }
                    if (recursionLevel && recursionLevel <= 4) {
                        recursionLevel += 1;
                        info['metadata'] = this.getMetadata(req, (<any>params.itemType).name, recursionLevel);
                        recursionLevel = undefined;
                    }
                }
                else {


                    info['type'] = m.propertyType.isArray ? "Array" : m.getType().name;
                    if (info['type'] != "String" && info['type'] != "Boolean" &&
                        info['type'] != "Number" && info['type'] != "Date" &&
                        info['type'] != "Object" && info['type'] != "Array") {
                        info['type'] = m.propertyType.isArray ? "Array" : "Object";
                        info['subtype'] = m.getType().name;
                        if (!recursionLevel) {
                            info['metadata'] = this.getMetadata(req, m.getType().name, 1);
                            recursionLevel = undefined;
                        }
                       
                    }
                   
                    
                    //info['rstype'] = m.getType().name;
                    //info['type'] =  m.propertyType.isArray ? [m.getType().name] : m.getType().name;
                }
                properties.push(info);
                
            }
        });
        metaData['id'] = type;
        metaData['properties'] = properties;
        if (!recursionLevel) {
            this.metaData[type] = metaData;
        }
        return metaData;
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
