/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
/// <reference path="../../typings/node/node.d.ts" />

import {ParamTypeCustom} from './param-type-custom';
//import * as node from require('node');

interface FieldMetaData {
    fields: { [key: string]: MetaData };
}

interface DecoratorMetaData {
    decorator: { [key: string]: FieldMetaData };
}

export interface GlobalExtended extends NodeJS.Global {
    models: { [key: string]: DecoratorMetaData };
}


//export interface IMetaTarget extends Object {
//    decorators: {};
//}

export enum DecoratorType {
    CLASS,
    METHOD,
    PROPERTY
}

export var modelLinks: { [key: string]: any } = {};

export function updateModelLinks(metaData: MetaData, embedded: boolean) {
    var param = <ParamTypeCustom><any>metaData.propertyType;
    if (param.rel) {
        var parent = getMetaData((<any>metaData.target).prototype || metaData.target, "document").params['name']
        var child = getMetaData((<any>param.itemType).prototype || param.itemType, "document").params['name']
        modelLinks[child] = modelLinks[child] || [];
        modelLinks[child].push({ metaData: metaData, embedded: embedded });
    }
}

export class MetaData {
    target: Object;
    propertyKey: string;
    decorator: string;
    propertyType: ParamTypeCustom;
    params: {};
    decoratorType: DecoratorType;

    constructor(target: Object, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey: string) {
        this.target = target;
        this.propertyKey = propertyKey;
        this.decorator = decorator;
        this.decoratorType = decoratorType;
        this.params = params;
        var type = Reflect.getMetadata("design:type", target, propertyKey);

        if (type === Array && !params) {
            throw TypeError;
        }
        // If it is not relation type/array type
        //if (type !== Array && !(params && (<any>params).rel)) {
        //    this.propertyType = new ParamTypeCustom((<any>params).rel, this.propertyType, (<any>params).itemType);
        //}
        
        this.propertyType = params
            ? new ParamTypeCustom((<any>params).rel, (<any>params).itemType, type === Array, (<any>params).embedded, ((<any>params).level ? (<any>params).level : -1))
            : new ParamTypeCustom(null, type, type === Array, false, -1);
    }
}

export function addMetaData(target: Object, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string) {
    if (!target) {
        throw TypeError;
    }
    // property/method decorator with no key passed
    if (arguments.length === 5 && !propertyKey) {
        throw TypeError;
    }
    propertyKey = propertyKey || '__';

    var gl: GlobalExtended = <any>global;
    gl.models = gl.models || <any>{};

    var name = this.getModelNameFromObject(target);
    gl.models[name] = gl.models[name] || <any>{};
    gl.models[name].decorator = gl.models[name].decorator || <any>{};
    gl.models[name].decorator[decorator] = gl.models[name].decorator[decorator] || <any>{};
    gl.models[name].decorator[decorator].fields = gl.models[name].decorator[decorator].fields || <any>{};

    if (!gl.models[name].decorator[decorator].fields[propertyKey]) {
        var metData: MetaData = new MetaData(target, decorator, decoratorType, params, propertyKey);
        gl.models[name].decorator[decorator].fields[propertyKey] = metData;
    }
}

export function getMetaData(target: Object, decorator: string, propertyKey?: string): MetaData {
    if (!target || !decorator) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = this.getModelNameFromObject(target);
    var gl: GlobalExtended = <any>global;
    if (gl.models[name]) {
        if (gl.models[name].decorator[decorator]) {
            return gl.models[name].decorator[decorator].fields[propertyKey];
        }
    }
    return null;
}

export function getMetaDataForField(target: Object, propertyKey?: string): MetaData {
    if (!target) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = this.getModelNameFromObject(target);
    var gl: GlobalExtended = <any>global;
    if (gl.models[name]) {
        for (var dec in gl.models[name].decorator) {
            for (var field in gl.models[name].decorator[dec].fields) {
                if (field == propertyKey) {
                    return gl.models[name].decorator[dec].fields[field];
                }
            }
        }
    }
    return null;
}

export function getAllMetaDataForDecorator(target: Object, decorator: string): { [key: string]: MetaData } {
    if (!target || !decorator) {
        throw TypeError;
    }

    var name = this.getModelNameFromObject(target);
    var gl: GlobalExtended = <any>global;

    if (gl.models[name]) {
        return gl.models[name].decorator[decorator].fields;
    }

    return null;
}

export function getAllMetaDataForAllDecorator(target: Object): { [key: string]: Array<MetaData> } {
    if (!target) {
        throw TypeError;
    }

    var meta: { [key: string]: Array<MetaData> } = <any>{};
    var gl: GlobalExtended = <any>global;
    var name = this.getModelNameFromObject(target);

    if (gl.models[name]) {
        for (var dec in gl.models[name].decorator) {
            for (var field in gl.models[name].decorator[dec].fields) {
                var metaData: MetaData = gl.models[name].decorator[dec].fields[field];
                meta[field] ? meta[field].push(metaData) : meta[field] = [metaData];
            }
        }
    }

    return meta;
}

export function getPrimaryKeyOfModel(target: Object): string {
    var gl: GlobalExtended = <any>global;
    var modelName = this.getModelNameFromObject(target);

    if (gl.models[modelName]) {
        for (var dec in gl.models[modelName].decorator) {
            for (var key in gl.models[modelName].decorator[dec].fields) {
                var meta: MetaData = gl.models[modelName].decorator[dec].fields[key];
                if ((<any>meta.params).isPrimary) {
                    return key;
                }
            }
        }
    }
    return null;
}

export function getModelNameFromObject(object: Object): string {
    var obj = (<any>object).prototype || object;
    return (<any>obj.constructor).name;
}
