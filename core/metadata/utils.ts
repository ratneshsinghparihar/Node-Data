import {ParamTypeCustom} from './param-type-custom';
import {DecoratorType} from '../enums';
import {Decorators, MetadataConstants} from '../constants';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../metadata/interfaces/metaroot';
import {MetaData} from './metadata';
import {DecoratorMetaData} from '../metadata/interfaces/decorator-metadata';

import {IAssociationParams} from '../decorators/interfaces/association-params';
import {IRepositoryParams} from '../decorators/interfaces/repository-params';

var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');
import * as Config from '../../config';
import * as SecurityConfig from '../../security-config';

export var metadataRoot: MetaRoot = new Map<Function | Object, DecoratorMetaData>();

interface IMetadataHelper {
    addMetaData(target: Object | Function, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string, paramIndex?: number);

    getMetaData(target: Object): { [key: string]: Array<MetaData> };
    getMetaData(target: Object, decorator: string): { [key: string]: MetaData };
    getMetaData(target: Object, decorator: string, propertyKey: string): MetaData;
    getMetaData(target: Object, decorator: string, propertyKey: string, paramIndex: number): MetaData;
    getMetaDataForDecorators(decorators: Array<string>): Array<{ target: Object, metadata: Array<MetaData> }>;
    getMetaDataForPropKey(target: Object, propertyKey?: string): Array<MetaData>;
    getMetaDataForPropKey(target: Object, propertyKey?: string, paramIndex?: number): Array<MetaData>;
    ensureLoggedIn();
}

class MetadataHelper {
    /**
     * Add any encountered metadata to the metadata root for later usage.
     * @param {(Object|Function)} target The function or function prototype where decorator is defined.
     * @param decorator The name of the decorator.
     * @param {DecoratorType} decoratorType The type of the decorator.
     * @param {Object} params The decorator params.
     * @param {string} [propertyKey] The property/parameter/method name.
     * @param {number} [paramIndex] The index if the decorator is paramter decorator.
     * @throws {TypeError} Target cannot be null.
     * @throws {SyntaxError} PropertyKey cannot be null for method/paramter decorator.
     */
    public static addMetaData(target: Object | Function, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string, paramIndex?: number) {
        if (!target) {
            throw TypeError;
        }

        if (!propertyKey && (decoratorType === DecoratorType.PROPERTY || decoratorType === DecoratorType.METHOD)) {
            throw new SyntaxError('propertyKey cannot be null or undefined for method/property decorator');
        }

        // class decorator and param decorator for constructor
        if (decoratorType === DecoratorType.CLASS || decoratorType === DecoratorType.PARAM) {
            propertyKey = MetadataConstants.CLASSDECORATOR_PROPKEY;
        }
        if (decoratorType === DecoratorType.PARAM) {
            if (paramIndex === null || paramIndex === undefined) {
                throw new SyntaxError('paramIndex should be greater than equal to 0 for param decorator');
            }
            // special case for param decorators
            propertyKey = propertyKey + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex;
        }

        let metaKey = MetadataHelper.getMetaKey(target);

        let decoratorMetadata: DecoratorMetaData = metadataRoot.get(metaKey) ? metadataRoot.get(metaKey) : {};
        decoratorMetadata[decorator] = decoratorMetadata[decorator] || {};
        if (decoratorMetadata[decorator][propertyKey]) {
            // Metadata for given combination already exists.
            return;
        }
        let metData: MetaData = new MetaData(target, MetadataHelper.isFunction(target), decorator, decoratorType, params, propertyKey, paramIndex);
        decoratorMetadata[decorator][propertyKey] = metData;
        metadataRoot.set(metaKey, decoratorMetadata);
    }

    /**
     * Get the metadata for the given target with the given decorator name and property/method name.
     * @param {(Object|Function)} target The function or function prototype where decorator is defined.
     * @param {string} decorator
     * @param {string} [propertyKey] Property/Method name where decorator is defined.
     * Returns class level MetaData for decorator if null/undefined.
     * @param {string} paramIndex The index of the parameter in case of param decorator.
     * @returns {MetaData} The metadata for the given target, decorator and propertyKey.
     */
    public static getMetaData(target: Object, decorator?: string, propertyKey?: string, paramIndex?: number): any {
        if (!target) {
            throw TypeError;
        }

        switch (arguments.length) {
            case 1: return MetadataHelper.getMetaDataForTarget(target);
            case 2: return MetadataHelper.getAllMetaDataForDecorator(target, decorator);
            case 3:
            case 4: return MetadataHelper.getMetaDataForTargetDecoratorAndPropKey(target, decorator, propertyKey, paramIndex);
            default: return null;
        }
    }

    /**
     * 
     * @param decorator
     */
    public static getMetaDataForDecorators(decorators: Array<string>): Array<{ target: Object, metadata: Array<MetaData> }> {
        var returnObj = [];
        for (let key of metadataRoot.keys()) {
            var metaArrForKey = Enumerable.from(metadataRoot.get(key)) // decoratormetadata: { [key: string]: { [key: string]: MetaData } };
                .where(keyVal => decorators.indexOf(keyVal.key) !== -1)
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

    public static getMetaDataForPropKey(target: Object, propertyKey?: string, paramIndex?: number): Array<MetaData> {
        if (!target) {
            throw TypeError;
        }

        propertyKey = propertyKey || MetadataConstants.CLASSDECORATOR_PROPKEY;
        var metaKey = MetadataHelper.getMetaKey(target);
        if (!metadataRoot.get(metaKey)) {
            return null;
        }

        return Enumerable.from(metadataRoot.get(metaKey))
            .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
            .where(keyVal => keyVal.key === propertyKey) // keyval = {[key(propName): string]: Metadata};
            .select(keyVal => keyVal.value) // keyval = {[key(propName): string]: Metadata};
            .toArray();
    }

    private static getMetaDataForTarget(target: Object): { [key: string]: Array<MetaData> } {
        if (!target) {
            throw TypeError;
        }

        var meta: { [key: string]: Array<MetaData> } = <any>{};
        var metaKey = MetadataHelper.getMetaKey(target);

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

    private static getAllMetaDataForDecorator(target: Object, decorator: string): { [key: string]: MetaData } {
        if (!target || !decorator) {
            throw TypeError;
        }

        var metaKey = MetadataHelper.getMetaKey(target);
        if (metadataRoot.get(metaKey)) {
            return metadataRoot.get(metaKey)[decorator]
        }

        return null;
    }

    private static getMetaDataForTargetDecoratorAndPropKey(target: Object, decorator: string, propertyKey: string, paramIndex?: number): MetaData {
        if (!target || !decorator) {
            throw TypeError;
        }

        propertyKey = propertyKey || MetadataConstants.CLASSDECORATOR_PROPKEY;

        if (paramIndex) {
            propertyKey += MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex;
        }

        var metaKey = MetadataHelper.getMetaKey(target);
        if (!metadataRoot.get(metaKey)) {
            return null;
        }
        if (metadataRoot.get(metaKey)[decorator]) {
            return metadataRoot.get(metaKey)[decorator][propertyKey];
        }
        return null;
    }

    private static getMetaKey(target: Function | Object): Object {
        return MetadataHelper.isFunction(target) ? (<Function>target).prototype : target;
    }

    private static isFunction(target: Function | Object) {
        if (typeof target === 'function') {
            return true;
        }
        return false;
    }

    // TODO: remove this once refactor is complete
    public static ensureLoggedIn() {
        return ensureLoggedIn();
    }
}

export var MetaUtils: IMetadataHelper = MetadataHelper;

//---------------------------------------------------------------------------------------------------------------------------------------------------------------

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


