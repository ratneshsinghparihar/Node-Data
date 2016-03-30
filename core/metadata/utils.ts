import {ParamTypeCustom} from './param-type-custom';
import {DecoratorType} from '../enums';
import {Decorators, MetadataConstants} from '../constants';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../metadata/interfaces/metaroot';
import {MetaData} from './metadata';
import {DecoratorMetaData} from '../metadata/interfaces/decorator-metadata';

import {IAssociationParams} from '../decorators/interfaces/association-params';
import {IRepositoryParams} from '../decorators/interfaces/repository-params';

let _metadataRoot: MetaRoot = new Map<Function | Object, DecoratorMetaData>();

export function metadataRoot(metadataRoot?): MetaRoot {
    if (metadataRoot !== undefined) {
        _metadataRoot = metadataRoot;
    }
    return _metadataRoot;
}

export function getMetaPropKey(decoratorType, propertyKey?, paramIndex?) {
    let metaPropKey = propertyKey;

    if (decoratorType === DecoratorType.METHOD && !propertyKey) {
        throw TypeError('propertyKey should not be null for method decorator');
    }
    if (decoratorType === DecoratorType.PARAM && (paramIndex === null || paramIndex === undefined || paramIndex < 0)) {
        throw TypeError('paramIndex should be greater than equal to 0 for param decorator');
    }
    if (decoratorType === DecoratorType.CLASS || (decoratorType === DecoratorType.PARAM && !propertyKey)) {
        metaPropKey = MetadataConstants.CLASSDECORATOR_PROPKEY;
    }
    if (decoratorType === DecoratorType.PARAM) {
        // special case for param decorators
        metaPropKey = metaPropKey + MetadataConstants.PROPKEY_PARAMINDEX_JOIN + paramIndex;
    }
    return metaPropKey;
}

interface IMetadataHelper {
    addMetaData(target: Object | Function, decorator: string, decoratorType: DecoratorType, params: {}, propertyKey?: string, paramIndex?: number);

    getMetaData(target: Object): Array<MetaData>;
    getMetaData(target: Object, decorator: string): Array<MetaData>;
    getMetaData(target: Object, decorator: string, propertyKey: string): MetaData;
    getMetaData(target: Object, decorator: string, propertyKey: string, paramIndex: number): MetaData;
    getMetaDataForDecorators(decorators: Array<string>): Array<{ target: Object, metadata: Array<MetaData> }>;
    getMetaDataForPropKey(target: Object, propertyKey?: string): Array<MetaData>;
    getMetaDataForPropKey(target: Object, propertyKey?: string, paramIndex?: number): Array<MetaData>;
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
     * @throws {TypeError} PropertyKey cannot be null for method/paramter decorator.
     */
    public static addMetaData(
        target: Object | Function,
        decorator: string,
        decoratorType: DecoratorType,
        params: {},
        propertyKey?: string,
        paramIndex?: number
    ): boolean {
        if (!target) {
            throw TypeError('target cannot be null/undefined');
        }

        if (!propertyKey && (decoratorType === DecoratorType.PROPERTY || decoratorType === DecoratorType.METHOD)) {
            throw TypeError('propertyKey cannot be null or undefined for method/property decorator');
        }

        let metaPropKey = getMetaPropKey(decoratorType, propertyKey, paramIndex);

        let metaKey = MetadataHelper.getMetaKey(target);

        let decoratorMetadata: DecoratorMetaData = _metadataRoot.get(metaKey) ? _metadataRoot.get(metaKey) : {};
        decoratorMetadata[decorator] = decoratorMetadata[decorator] || {};
        if (decoratorMetadata[decorator][metaPropKey]) {
            // Metadata for given combination already exists.
            return false;
        }
        let metaTarget = MetadataHelper.isFunction(target) ? (<Function>target).prototype : target;
        let metadata: MetaData = new MetaData(metaTarget, MetadataHelper.isFunction(target), decorator, decoratorType, params, propertyKey, paramIndex);
        decoratorMetadata[decorator][metaPropKey] = metadata;
        _metadataRoot.set(metaKey, decoratorMetadata);
        return true;
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
        switch (arguments.length) {
            case 1: return MetadataHelper.getMetaDataForTarget(target);
            case 2: return MetadataHelper.getAllMetaDataForDecorator(target, decorator);
            case 3: return MetadataHelper.getMetaDataForTargetDecoratorAndPropKey(DecoratorType.METHOD, target, decorator, propertyKey, paramIndex);
            case 4: return MetadataHelper.getMetaDataForTargetDecoratorAndPropKey(DecoratorType.PARAM, target, decorator, propertyKey, paramIndex);
        }
    }

    /**
     * 
     * @param decorator
     */
    public static getMetaDataForDecorators(decorators: Array<string>): Array<{ target: Object, metadata: Array<MetaData> }> {
        var returnObj = [];
        if (!(decorators && decorators.length)){
            return returnObj;
        }
        for (let key of _metadataRoot.keys()) {
            var metaArrForKey = Enumerable.from(_metadataRoot.get(key)) // decoratormetadata: { [key: string]: { [key: string]: MetaData } };
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
            throw TypeError('target cannot be null');
        }

        propertyKey = propertyKey || MetadataConstants.CLASSDECORATOR_PROPKEY;
        var metaKey = MetadataHelper.getMetaKey(target);
        if (!_metadataRoot.get(metaKey)) {
            return null;
        }

        return Enumerable.from(_metadataRoot.get(metaKey))
            .selectMany(keyval => keyval.value) // keyval = {[key(decoratorName): string]: {[key(propName)]: Metadata}};
            .where(keyVal => keyVal.key === propertyKey) // keyval = {[key(propName): string]: Metadata};
            .select(keyVal => keyVal.value) // keyval = {[key(propName): string]: Metadata};
            .toArray();
    }

    private static getMetaDataForTarget(target: Object): Array<MetaData> {
        if (!target) {
            throw TypeError('target cannot be null or undefined');
        }

        var metaKey = MetadataHelper.getMetaKey(target);

        if (!_metadataRoot.get(metaKey)) {
            return null;
        }

        return Enumerable.from(_metadataRoot.get(metaKey))
            .selectMany(keyval => keyval.value)
            .select(keyVal => keyVal)
            .toArray();
    }

    private static getAllMetaDataForDecorator(target: Object, decorator: string): Array<MetaData> {
        if (!target || !decorator) {
            throw TypeError('target and decorator cannot be null or undefined');
        }

        var metaKey = MetadataHelper.getMetaKey(target);

        if (!_metadataRoot.get(metaKey)) {
            return null;
        }
        return Enumerable.from(_metadataRoot.get(metaKey)[decorator])
            .select(keyVal => keyVal)
            .toArray();
    }

    private static getMetaDataForTargetDecoratorAndPropKey(
        decoratorType: DecoratorType,
        target: Object,
        decorator: string,
        propertyKey: string,
        paramIndex?: number
    ): MetaData {
        if (!target || !decorator) {
            throw TypeError('target and decorator cannot be null or undefined');
        }

        let metaPropKey = getMetaPropKey(decoratorType, propertyKey, paramIndex);

        var metaKey = MetadataHelper.getMetaKey(target);
        if (!_metadataRoot.get(metaKey)) {
            return null;
        }
        if (_metadataRoot.get(metaKey)[decorator]) {
            return _metadataRoot.get(metaKey)[decorator][metaPropKey];
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
}

export var MetaUtils: IMetadataHelper = MetadataHelper;
