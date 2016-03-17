import {ParamTypeCustom} from './param-type-custom';
import {Strict, DecoratorType} from '../../enums';
import * as Utils from '../../utils';
import {Decorators} from '../../constants';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../interfaces/metaroot';
import {MetaData} from './metadata';
import {DecoratorMetaData} from '../interfaces/decorator-metadata';

import {IDocumentParams, IAssociationParams, IFieldParams, IInjectParams} from '../interfaces/meta-params';
import {IRepositoryParams} from '../interfaces/repository-params';

var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');
import * as Config from '../../config';
import * as SecurityConfig from '../../security-config';

export var metadataRoot: MetaRoot = new Map<Function | Object, DecoratorMetaData>();

/**
 * add metadata to metadata root for runtime/future processing
 * @param target
 * @param decorator
 * @param decoratorType
 * @param params
 * @param propertyKey
 * @param paramIndex
 */
export function addMetaData(target: Object|Function, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string, paramIndex?: number) {
    if (!target) {
        throw TypeError;
    }   
    // property/method decorator with no key passed
    if (arguments.length === 5 && !propertyKey) {
        throw TypeError;
    }
    propertyKey = propertyKey || '__';
    // special case for param decorators
    propertyKey = propertyKey + (paramIndex !== undefined ? '_' + paramIndex : '');

    var metaKey = getMetaKey(target);

    var decoratorMetadata: DecoratorMetaData = metadataRoot.get(metaKey) ? metadataRoot.get(metaKey) : {};
    decoratorMetadata[decorator] = decoratorMetadata[decorator] || {};
    if (!decoratorMetadata[decorator][propertyKey]) {
        var metData: MetaData = new MetaData(target, isFunction(target), decorator, decoratorType, params, propertyKey, paramIndex);
        decoratorMetadata[decorator][propertyKey] = metData;
        metadataRoot.set(metaKey, decoratorMetadata);
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

    var metaKey = getMetaKey(target);
    if (!metadataRoot.get(metaKey)) {
        return null;
    }
    if (metadataRoot.get(metaKey)[decorator]) {
        return metadataRoot.get(metaKey)[decorator][propertyKey];
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

    var metaKey = getMetaKey(target);
    if (metadataRoot.get(metaKey)) {
        return metadataRoot.get(metaKey)[decorator]
    }

    return null;
}

export function getMetaDataForDecoratorInAllTargets(decorator: string): Array<{ target: Object, metadata: Array<MetaData> }> {
    var returnObj = [];
    for (let key of metadataRoot.keys()) {
        var metaArrForKey = Enumerable.from(metadataRoot.get(key)) // decoratormetadata: { [key: string]: { [key: string]: MetaData } };
            .where(keyVal => {
                return keyVal.key === decorator;
            })
            .selectMany(keyval => {
                return keyval.value;
            }) //{ [key: string]: MetaData }
            .select(keyVal => keyVal.value)
            .toArray();
        if (metaArrForKey.length) {
            returnObj.push({ target: key, metadata: metaArrForKey });
        }
    }
    return returnObj;
}

/**
 * gets metadata of the primary key if the given target
 * @param target
 */
export function getPrimaryKeyMetadata(target: Object): MetaData {
    if (!target) {
        throw TypeError;
    }

    var metaKey = getMetaKey(target);
    if (!metadataRoot.get(metaKey)) {
        return null;
    }

    return Enumerable.from(metadataRoot.get(metaKey)[Decorators.FIELD])
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
    var metaKey = getMetaKey(target);
    if (!metadataRoot.get(metaKey)) {
        return null;
    }

    return Enumerable.from(metadataRoot.get(metaKey))
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
    var metaKey = getMetaKey(target);

    if (!metadataRoot.get(metaKey)) {
        return null;
    }

    Enumerable.from(metadataRoot.get(metaKey))
        .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
        .forEach(keyVal => {
            // keyval = {[key(propName): string]: Metadata};
            var metaData: MetaData = keyVal.value;
            meta[keyVal.key] ? meta[keyVal.key].push(metaData) : meta[keyVal.key] = [metaData];
        });

    return meta;
}

export function getMetaKey(target: Function | Object) {
    return isFunction(target) ? (<Function>target).prototype : target;
}

function isFunction(target: Function | Object) {
    if (typeof target === 'function') {
        return true;
    }
    return false;
}

/**
 * Get all the metadata of all the decorators of all the models referencing current target, i.e. (rel = target relation name)
 * @param target like UserModel (function of prototype)
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

    var metaArr = [];
    metadataRoot.forEach((value: DecoratorMetaData, key) => {
        var relations = Enumerable.from(value)
            //.selectMany((keyVal: any) => keyVal.value.decorator) //{ key: string(modelName), value: DecoratorMetaData }
            .where((keyVal: any) => {
                return Utils.isRelationDecorator(keyVal.key);
            }) //{ key: string(decoratorName), value: { [key: string(fieldName)]: MetaData } }
            .selectMany(keyVal => keyVal.value) //{ key: string(decoratorName), value: { [key: string(fieldName)]: MetaData } }
            .where(keyVal => (<IAssociationParams>(<MetaData>keyVal.value).params).rel === params.name) // {key: string(fieldName), value: MetaData}
            .select(keyVal => keyVal.value) // {key: string(fieldName), value: MetaData}
            .toArray();
        if (relations && relations.length) {
            metaArr = metaArr.concat(relations);
        }
    });
    return metaArr;
}

/**
 * Get all the metadata of all the decorators of all the models referencing current target, i.e. (rel = target relation name)
 * @param target like UserModel (function of prototype)
 *
 */
export function getAllRelationsForTargetInternal(target: Object): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }
    //global.models.CourseModel.decorator.manytomany.students
    var metaKey = getMetaKey(target);

    if (!metadataRoot.get(metaKey)) {
        return null;
    }

    return Enumerable.from(metadataRoot.get(metaKey))
        .where((keyVal: any) => Utils.isRelationDecorator(keyVal.key))
        .selectMany((keyVal: any) => 
                    {
                        return keyVal.value
                    }) //{ key: string(decoratorname), value: { [key: string]: MetaData } }
        .select(keyVal =>{
            
        return keyVal.value}) // {key: string(fieldName), value: MetaData}
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
    var resources = [];

    metadataRoot.forEach((value, key) => {
        var resource = Enumerable.from(value)
            //.selectMany((keyVal: any) => keyVal.value.decorator) //{ key: string(modelName), value: DecoratorMetaData }
            .where((keyVal: any) => keyVal.key === Decorators.REPOSITORY)
            .select(keyVal => keyVal.value["__"] ? (<IRepositoryParams>(<MetaData>keyVal.value)["__"].params).path : '')
            .firstOrDefault(null, null);
        if (resource) {
            resources.push(resource);
        }
    });
    return resources;
}

export function getAllRelationalMetaDataForField(target: Object, propertyKey?: string): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';

    var metaKey = getMetaKey(target);
    if (!metadataRoot.get(metaKey)) {
        return null;
    }

    return Enumerable.from(metadataRoot.get(metaKey))
        .where((keyVal: any) => Utils.isRelationDecorator(keyVal.key))
        .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
        .where(keyVal => keyVal.key === propertyKey) // keyval = {[key(propName): string]: Metadata};
        .select(keyVal => keyVal.value) // keyval = {[key(propName): string]: Metadata};
        .toArray();
}


var authenticateByToken = expressJwt({
    secret: SecurityConfig.SecurityConfig.tokenSecretkey,
    credentialsRequired: true,
    getToken: function fromHeaderOrQuerystring(req) {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.token) {
            return req.query.token;
        } else if (req.cookies && req.cookies.authorization) {
            return req.cookies.authorization;
        }
        return null;
    }
});


export function ensureLoggedIn() {
if (Config.Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.disabled]) {
        return function (req, res, next) {
            next();
        }
    }

//by token
if (Config.Security.authenticationType == SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.TokenBased]) {
        return authenticateByToken;
    }

//by password
if (Config.Security.authenticationType == SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.passwordBased]) {
        return loggedIn();
    }

    return function (req, res, next) {
        next();
    }
}
