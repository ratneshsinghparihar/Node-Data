import {ParamTypeCustom} from './param-type-custom';
import {DecoratorType} from '../enums';
import {winstonLog} from '../../logging/winstonLog';
import {Decorators, MetadataConstants} from '../constants';
import * as Enumerable from 'linq';
import {MetaRoot} from '../metadata/interfaces/metaroot';
import {MetaData, IMetaOptions} from './metadata';
import {DecoratorMetaData} from '../metadata/interfaces/decorator-metadata';
import * as ReflectUtils from '../reflect/reflect-utils';

import {IAssociationParams} from '../decorators/interfaces/association-params';
import {IRepositoryParams} from '../decorators/interfaces/repository-params';

let _metadataRoot: MetaRoot = new Map<Function | Object, DecoratorMetaData>();
let _nameAndTargetMapping: any = {};
let _documnetNameAndTargetMapping: any = {};

let childProcessId:any;

export function metadataRoot(metadataRoot?): MetaRoot {
    if (metadataRoot !== undefined) {
        _metadataRoot = metadataRoot;
    }
    return _metadataRoot;
}

export function getMetaPropKey(decoratorType, propertyKey?, paramIndex?) {
    let metaPropKey = propertyKey;

    if (decoratorType === DecoratorType.METHOD && !propertyKey) {
        winstonLog.logError('propertyKey should not be null for method decorator');
        throw TypeError('propertyKey should not be null for method decorator');
    }
    if (decoratorType === DecoratorType.PARAM && (paramIndex === null || paramIndex === undefined || paramIndex < 0)) {
        winstonLog.logError('paramIndex should be greater than equal to 0 for param decorator');
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
    childProcessId:any;
    addMetaData(target: Object | Function, metaOptions: IMetaOptions): boolean;

    getMetaData(target: Object): Array<MetaData>;
    getMetaDataFromType(modelType: string): Array<MetaData>;
    getMetaData(target: Object, decorator: string): Array<MetaData>;
    getMetaData(target: Object, decorator: string, propertyKey: string): MetaData;
    getMetaData(target: Object, decorator: string, propertyKey: string, paramIndex: number): MetaData;
    getMetaDataForDecorators(decorators: Array<string>): Array<{ target: Object, metadata: Array<MetaData> }>;
    getMetaDataForPropKey(target: Object, propertyKey?: string): Array<MetaData>;
    getMetaDataForPropKey(target: Object, propertyKey?: string, paramIndex?: number): Array<MetaData>;
    refreshDerivedObjectsMetadata();
    getDescriptiveMetadata(type, baseRelMeta, recursionLevel?: number): any;
}

class MetadataHelper {
    public static childProcessId:any;
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
    public static addMetaData(target: Object | Function, metaOptions: IMetaOptions): boolean {
        if (!target) {
            winstonLog.logError('target cannot be null/undefined');
            throw TypeError('target cannot be null/undefined');
        }

        if (!metaOptions.propertyKey && (metaOptions.decoratorType === DecoratorType.PROPERTY || metaOptions.decoratorType === DecoratorType.METHOD)) {
            winstonLog.logError('propertyKey cannot be null or undefined for method/property decorator');
            throw TypeError('propertyKey cannot be null or undefined for method/property decorator');
        }
        if ((<any>target).name) {
            _nameAndTargetMapping[(<any>target).name] = target;
        } else if (target.constructor.name) {
            _nameAndTargetMapping[(<any>target).constructor.name] = target;
        }
        if (metaOptions.decorator == "document" && metaOptions.params && metaOptions.params.name ) {
            _documnetNameAndTargetMapping[metaOptions.params.name] = target;
        }

        let metaPropKey = getMetaPropKey(metaOptions.decoratorType, metaOptions.propertyKey, metaOptions.paramIndex);

        let metaKey = MetadataHelper.getMetaKey(target);

        let decoratorMetadata: DecoratorMetaData = _metadataRoot.get(metaKey) ? _metadataRoot.get(metaKey) : {};
        decoratorMetadata[metaOptions.decorator] = decoratorMetadata[metaOptions.decorator] || {};
        if (decoratorMetadata[metaOptions.decorator][metaPropKey]) {
            // Metadata for given combination already exists.
            return false;
        }
        let metaTarget = MetadataHelper.isFunction(target) ? (<Function>target).prototype : target;
        let metadata: MetaData = new MetaData(
            metaTarget,
            MetadataHelper.isFunction(target),
            metaOptions);
        decoratorMetadata[metaOptions.decorator][metaPropKey] = metadata;
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

    public static getMetaDataFromType(modelType: string): Array<MetaData> {
        if (_documnetNameAndTargetMapping[modelType])
            return MetadataHelper.getMetaDataForTarget(_documnetNameAndTargetMapping[modelType]);

        if (_nameAndTargetMapping[modelType])
            return MetadataHelper.getMetaDataForTarget(_nameAndTargetMapping[modelType]);
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
            winstonLog.logError('target cannot be null');
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

    public static refreshDerivedObjectsMetadata() {
        var documents = MetadataHelper.getMetaDataForDecorators([Decorators.DOCUMENT]);
        var proto = '__proto__';
        Enumerable.from(documents).forEach(x => {
            var tar = x.metadata[0].target;
            var pro = tar[proto];
            console.log(tar);
            while (pro != null) {
                var met = MetadataHelper.getMetaData(pro);
                Enumerable.from(met).forEach((prop: any) => {
                    MetadataHelper.addMetaData(tar,
                        {
                            propertyKey: prop.propertyKey,
                            paramIndex: prop.paramIndex,
                            decorator: prop.decorator,
                            decoratorType: prop.decoratorType,
                            params: prop.params,
                            type: prop.propertyType,
                            returnType: prop.returnType,
                            paramTypes: prop.paramTypes
                        });
                });
                pro = pro[proto];
            }
        });
    }

    private static getMetaDataForTarget(target: Object): Array<MetaData> {
        if (!target) {
            winstonLog.logError('target cannot be null or undefined');
            throw TypeError('target cannot be null or undefined');
        }

        var metaKey = MetadataHelper.getMetaKey(target);

        if (!_metadataRoot.get(metaKey)) {
            return null;
        }

        return Enumerable.from(_metadataRoot.get(metaKey))
            .selectMany(keyval => keyval.value)
            .select(keyVal => keyVal.value)
            .toArray();
    }

    private static getAllMetaDataForDecorator(target: Object, decorator: string): Array<MetaData> {
        if (!target || !decorator) {
            winstonLog.logError('target and decorator cannot be null or undefined');
            throw TypeError('target and decorator cannot be null or undefined');
        }

        var metaKey = MetadataHelper.getMetaKey(target);

        if (!_metadataRoot.get(metaKey)) {
            return null;
        }

        return Enumerable.from(_metadataRoot.get(metaKey)[decorator])
            .select(keyVal => keyVal.value)
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
            winstonLog.logError('target and decorator cannot be null or undefined');
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


    public static getDescriptiveMetadata(type, baseRelMeta, recursionLevel?: number): any {
        var metas;

        metas = MetaUtils.getMetaDataFromType(type);
        //var props: { [key: string]: MetaData } = <any>{};

        var metaData = {};

        var properties = [];
        Enumerable.from(metas).forEach(x => {
            var m = x as MetaData;
            if (m.decoratorType == DecoratorType.PROPERTY) {
                var params: IAssociationParams = <IAssociationParams>m.params;
                var info = {};
                info['name'] = m.propertyKey;
                if (params && params.rel) {

                    if (baseRelMeta) {
                        var relMeta = baseRelMeta + m.getType().name;
                        info['href'] = relMeta;
                    }

                    info['subtype'] = m.getType().name;
                    info['type'] = m.propertyType.isArray ? "Array" : "Object";
                    if (!recursionLevel) {
                        info['metadata'] = this.getDescriptiveMetadata((<any>params.itemType).name, baseRelMeta, 1);
                        recursionLevel = undefined;
                    }
                    if (recursionLevel && recursionLevel <= 4) {
                        recursionLevel += 1;
                        info['metadata'] = this.getDescriptiveMetadata((<any>params.itemType).name, baseRelMeta, recursionLevel);
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
                            info['metadata'] = this.getDescriptiveMetadata(m.getType().name, baseRelMeta, 1);
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
       
        return metaData;
    }


}

export var MetaUtils: IMetadataHelper = MetadataHelper;
