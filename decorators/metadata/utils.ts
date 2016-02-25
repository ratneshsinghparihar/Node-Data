/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../typings/linq/linq.3.0.3-Beta4.d.ts" />

import {ParamTypeCustom} from './param-type-custom';
import {Strict} from '../../enums/document-strict';
import * as Utils from '../../utils/utils';
import {DecoratorType} from '../../enums/decorator-type';
import {Decorators} from '../../constants/decorators';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../interfaces/metaroot';
import {MetaData} from './metadata';
import {DecoratorMetaData} from '../interfaces/decorator-metadata';

import {IDocumentParams} from '../interfaces/document-params';
import {IRepositoryParams} from '../interfaces/repository-params';
import {IFieldParams} from '../interfaces/field-params';
import {IAssociationParams} from '../interfaces/association-params';

export var metadataRoot: MetaRoot = <any>{};

/**
 * add metadata to metadata root for runtime/future processing
 * @param target
 * @param decorator
 * @param decoratorType
 * @param params
 * @param propertyKey
 */
export function addMetaData(target: Object, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string) {
    if (!target) {
        throw TypeError;
    }
    // property/method decorator with no key passed
    if (arguments.length === 5 && !propertyKey) {
        throw TypeError;
    }
    propertyKey = propertyKey || '__';

    metadataRoot.models = metadataRoot.models || <any>{};

    var name = getModelNameFromObject(target);
    metadataRoot.models[name] = metadataRoot.models[name] || <any>{};
    metadataRoot.models[name].decorator = metadataRoot.models[name].decorator || <any>{};
    metadataRoot.models[name].decorator[decorator] = metadataRoot.models[name].decorator[decorator] || <any>{};
    //metadataRoot.models[name].decorator[decorator].fields = metadataRoot.models[name].decorator[decorator].fields || <any>{};

    if (!metadataRoot.models[name].decorator[decorator][propertyKey]) {
        var metData: MetaData = new MetaData(target, decorator, decoratorType, params, propertyKey);
        metadataRoot.models[name].decorator[decorator][propertyKey] = metData;
    }
}

/**
 * gets the metadata for the given target, decorator and property key
 * @param target
 * @param decorator
 * @param propertyKey Optional (If null returns class level MetaData for decorator)
 */
export function getMetaData(target: Object, decorator: string, propertyKey?: string): MetaData {
    if (!target || !decorator) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = getModelNameFromObject(target);
    if (!metadataRoot.models[name]) {
        return null;
    }
    if (metadataRoot.models[name].decorator[decorator]) {
        return metadataRoot.models[name].decorator[decorator][propertyKey];
    }
    return null;
}

/**
 * get all the metadata for the given decorator in the given target
 * @param target
 * @param decorator
 * returns { [key: string]: MetaData } where(key is the fieldname)
 */
export function getAllMetaDataForDecorator(target: Object, decorator: string): { [key: string]: MetaData } {
    if (!target || !decorator) {
        throw TypeError;
    }

    var name = getModelNameFromObject(target);

    if (metadataRoot.models[name]) {
        return metadataRoot.models[name].decorator[decorator];
    }

    return null;
}

/**
 * gets metadata of the primary key if the given target
 * @param target
 */
export function getPrimaryKeyMetadata(target: Object): MetaData {
    if (!target) {
        throw TypeError;
    }

    var name = getModelNameFromObject(target);

    if (!metadataRoot.models[name]) {
        return null;
    }

    return Enumerable.from(metadataRoot.models[name].decorator[Decorators.FIELD])
        .where(keyval => keyval.value.params.primary) // keyval = {[key(propName): string]: Metadata};
        .select(keyVal => keyVal.value)
        .firstOrDefault(null, null);
}

/**
 * get all the metadata for the given property key in the given target
 * if propertyKey is null/undefined, returns document level Metadata (which does not have property Key)
 * @param target
 * @param propertyKey
 */
export function getAllMetaDataForField(target: Object, propertyKey?: string): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = getModelNameFromObject(target);
    if (!metadataRoot.models[name]) {
        return null;
    }

    return Enumerable.from(metadataRoot.models[name].decorator)
        .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
        .where(keyVal =>keyVal.key === propertyKey) // keyval = {[key(propName): string]: Metadata};
        .select(keyVal => keyVal.value) // keyval = {[key(propName): string]: Metadata};
        .toArray(); 
}

/**
 * get all the metadata for all the decorators of the given target
 * @param target
 */
export function getAllMetaDataForAllDecorator(target: Object): { [key: string]: Array<MetaData> } {
    if (!target) {
        throw TypeError;
    }

    var meta: { [key: string]: Array<MetaData> } = <any>{};
    var name = getModelNameFromObject(target);

    var aa = metadataRoot.models;
    if (!metadataRoot.models[name]) {
        return null;
    }

    Enumerable.from(metadataRoot.models[name].decorator)
        .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
        .forEach(keyVal => {
            // keyval = {[key(propName): string]: Metadata};
            var metaData: MetaData = keyVal.value;
            meta[keyVal.key] ? meta[keyVal.key].push(metaData) : meta[keyVal.key] = [metaData];
        });

    return meta;
}

/**
 * get name of the given object (function or its prototype)
 * @param obj
 */
export function getModelNameFromObject(obj: any): string {
    if (obj.default) {
        return obj.default.name;
    }
    if (obj.prototype) {
        obj = obj.prototype;
    }
    if (obj.constructor) {
        return (obj.constructor).name;
    }
    return obj.name;
}

/**
 * Get all the metadata of all the decorators of all the models referencing current target, i.e. (rel = target relation name)
 * @param target
 *
 */
export function getAllRelationsForTarget(target: Object): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }
    //global.models.CourseModel.decorator.manytomany.students
    var meta = getMetaData(target, Decorators.DOCUMENT);
    var params = <IDocumentParams>meta.params;
    if (!meta || !params || !params.name) {
        return null;
    }

    return Enumerable.from(metadataRoot.models)
        .selectMany((keyVal: any) => keyVal.value.decorator) //{ key: string(modelName), value: DecoratorMetaData }
        .where((keyVal: any) => Utils.isRelationDecorator(keyVal.key)) //{ key: string(decoratorName), value: { [key: string(fieldName)]: MetaData } }
        .selectMany(keyVal => keyVal.value) //{ key: string(decoratorName), value: { [key: string(fieldName)]: MetaData } }
        .where(keyVal => (<IAssociationParams>(<MetaData>keyVal.value).params).rel === params.name) // {key: string(fieldName), value: MetaData}
        .select(keyVal => keyVal.value) // {key: string(fieldName), value: MetaData}
        .toArray();
}

//@document({ name: 'blogs', isStrict: false })
//export class BlogModel
//this will return 'blogs' 
export function getResourceNameFromModel(object: Object): string {   
    var meta = getMetaData(object, Decorators.DOCUMENT) 
    
    if(!meta || !meta.params){
        return null;
    }
    return (<IDocumentParams>meta.params).name;
}

//@document({ name: 'blogs', isStrict: false })
//export class BlogModel
//this will return 'blogs' 
//if calling from repo w/o object you will atleast know the name of all resources
export function getAllResourceNames(): Array<string> {
     return Enumerable.from(metadataRoot.models)
        .selectMany((keyVal: any) => keyVal.value.decorator) //{ key: string(modelName), value: DecoratorMetaData }
        .where((keyVal: any) => keyVal.key === Decorators.REPOSITORY) //{ key: string(decoratorName), value: { [key: string(fieldName)]: MetaData } }
        .selectMany(keyVal => keyVal.value) //{ key: string(decoratorName), value: { [key: string(fieldName)]: MetaData } }
        .select(keyVal => (<IRepositoryParams>(<MetaData>keyVal.value).params).path) // {key: string(fieldName), value: MetaData}
        .toArray();
}
