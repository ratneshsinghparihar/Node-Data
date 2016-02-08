/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
import {ParamTypeCustom} from './param-type-custom';

export interface IMetaTarget extends Object {
    decorators: {};
}

export enum DecoratorType {
    CLASS,
    METHOD,
    PROPERTY
}

export class MetaData {
    target: Object;
    propertyKey: string;
    decorator: string;
    propertyType: any;
    params: {};
    decoratorType: DecoratorType;

    constructor(target: Object, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey: string) {
        this.target = target;
        this.propertyKey = propertyKey;
        this.decorator = decorator;
        this.decoratorType = decoratorType;
        this.params = params;
        this.propertyType = Reflect.getMetadata("design:type", target, propertyKey);

        if (this.propertyType === Array && !params) {
            throw TypeError;
        }
        // If it is not relation type/array type return
        if (this.propertyType !== Array && !(params && (<any>params).rel)) {
            return;
        }
        this.propertyType = new ParamTypeCustom((<any>params).rel, this.propertyType, (<any>params).itemType);
    }
}

export function addMetaData(target: IMetaTarget, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string) {
    if (!target) {
        throw TypeError;
    }
    // property/method decorator with no key passed
    if (arguments.length === 5 && !propertyKey) {
        throw TypeError;
    }
    target.decorators = target.decorators || {};
    target.decorators[decorator] = target.decorators[decorator] || {};
    if (getMetaData(target, decorator, propertyKey)) {
        // already added
        return;
    }
    target.decorators[decorator][propertyKey] = new MetaData(target, decorator, decoratorType, params, propertyKey);
}

export function getMetaData(target: IMetaTarget, decorator: string, propertyKey?: string): MetaData {
    if (!target || !decorator) {
        throw TypeError;
    }
    if (!target.decorators) {
        return null;
    }
    return target.decorators[decorator][propertyKey];
}

export function getAllMetaDataForDecorator(target: IMetaTarget, decorator: string): {[key: string]: MetaData} {
    if (!target || !decorator) {
        throw TypeError;
    }
    if (!target.decorators) {
        return null;
    }
    return target.decorators[decorator];
}

export function getAllMetaDataForAllDecorator(target: IMetaTarget): { [key: string]: Array<MetaData> } {
    if (!target) {
        throw TypeError;
    }
    if (!target.decorators) {
        return null;
    }
    var meta: { [key: string]: Array<MetaData> } = <any>{};

    for (var prop in target.decorators) {
        for (var prop1 in target.decorators[prop]) {
            var metaData = <MetaData>target.decorators[prop][prop1];
            meta[prop1] ? meta[prop1].push(metaData) : meta[prop1] = [metaData];
        }
    }
    return meta;
}
