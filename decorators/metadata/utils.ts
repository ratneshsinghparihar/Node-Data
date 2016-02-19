/// <reference path="../../node_modules/reflect-metadata/reflect-metadata.d.ts" />
/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../typings/linq/linq.3.0.3-Beta4.d.ts" />

import {ParamTypeCustom} from './param-type-custom';
import {Strict} from '../../enums/document-strict';
import * as Utils from '../../utils/utils';
import {DecoratorType} from '../../enums/decorator-type';
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {MetaRoot} from '../interfaces/metaroot';
import {MetaData} from './metadata';

import {IDocumentParams} from '../interfaces/document-params';
import {IFieldParams} from '../interfaces/field-params';
import {IAssociationParams} from '../interfaces/association-params';

export var metadataRoot: MetaRoot = <any>{};

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

    var name = this.getModelNameFromObject(target);
    metadataRoot.models[name] = metadataRoot.models[name] || <any>{};
    metadataRoot.models[name].decorator = metadataRoot.models[name].decorator || <any>{};
    metadataRoot.models[name].decorator[decorator] = metadataRoot.models[name].decorator[decorator] || <any>{};
    metadataRoot.models[name].decorator[decorator].fields = metadataRoot.models[name].decorator[decorator].fields || <any>{};

    if (!metadataRoot.models[name].decorator[decorator].fields[propertyKey]) {
        var metData: MetaData = new MetaData(target, decorator, decoratorType, params, propertyKey);
        metadataRoot.models[name].decorator[decorator].fields[propertyKey] = metData;
    }
}

export function getMetaData(target: Object, decorator: string, propertyKey?: string): MetaData {
    if (!target || !decorator) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = this.getModelNameFromObject(target);
    if (metadataRoot.models[name]) {
        if (metadataRoot.models[name].decorator[decorator]) {
            return metadataRoot.models[name].decorator[decorator].fields[propertyKey];
        }
    }
    return null;
}

export function getMetaDataForField(target: Object, propertyKey?: string): MetaData {
    if (!target) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = getModelNameFromObject(target);
    if (metadataRoot.models[name]) {
        for (var dec in metadataRoot.models[name].decorator) {
            for (var field in metadataRoot.models[name].decorator[dec].fields) {
                if (field == propertyKey) {
                    return metadataRoot.models[name].decorator[dec].fields[field];
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

    if (metadataRoot.models[name]) {
        return metadataRoot.models[name].decorator[decorator].fields;
    }

    return null;
}

export function getPrimaryKeyMetadata(target: Object): MetaData {
    if (!target) {
        throw TypeError;
    }

    var name = this.getModelNameFromObject(target);

    if (!metadataRoot.models[name]) {
        return null;
    }
    var allFields = metadataRoot.models[name].decorator['field'].fields;
    for (var field in allFields) {
        if ((<any>allFields[field].params).primary) {
            return allFields[field];
        }
    }
    return null;
}

export function getAllMetaDataForField(target: Object, propertyKey?: string): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }

    propertyKey = propertyKey || '__';
    var name = this.getModelNameFromObject(target);
    if (!metadataRoot.models[name]) {
        return null;
    }
    var metadataArr: Array<MetaData> = [];
    for (var dec in metadataRoot.models[name].decorator) {
        for (var field in metadataRoot.models[name].decorator[dec].fields) {
            if (field == propertyKey) {
                metadataArr.push(metadataRoot.models[name].decorator[dec].fields[field]);
            }
        }
    }
    return metadataArr;
}

export function getAllMetaDataForAllDecorator(target: Object): { [key: string]: Array<MetaData> } {
    if (!target) {
        throw TypeError;
    }

    var meta: { [key: string]: Array<MetaData> } = <any>{};
    var name = this.getModelNameFromObject(target);

    if (metadataRoot.models[name]) {
        for (var dec in metadataRoot.models[name].decorator) {
            for (var field in metadataRoot.models[name].decorator[dec].fields) {
                var metaData: MetaData = metadataRoot.models[name].decorator[dec].fields[field];
                meta[field] ? meta[field].push(metaData) : meta[field] = [metaData];
            }
        }
    }

    return meta;
}

export function getPrimaryKeyOfModel(target: Object): string {
    var modelName = this.getModelNameFromObject(target);

    if (metadataRoot.models[modelName]) {
        for (var dec in metadataRoot.models[modelName].decorator) {
            for (var key in metadataRoot.models[modelName].decorator[dec].fields) {
                var meta: MetaData = metadataRoot.models[modelName].decorator[dec].fields[key];
                if ((<any>meta.params).primary) {
                    return key;
                }
            }
        }
    }
    return null;
}

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


export function getAllRelationsForTarget(target: Object): Array<MetaData> {
    if (!target) {
        throw TypeError;
    }
    //global.models.CourseModel.decorator.manytomany.fields.students
    var meta = getMetaDataForField(target);
    var relName = (<IDocumentParams>meta.params).name;
    //var name = this.getModelNameFromObject(target);

    return Enumerable.from(metadataRoot.models)
        .selectMany(keyVal => keyVal.value.decorator)
        .where(keyVal => Utils.isRelationDecorator(keyVal.key))
        .selectMany(keyVal => keyVal.value.fields)
        .select(keyVal => keyVal.value)
        .where(x => (<IAssociationParams>(<MetaData>x).params).rel === relName)
        .toArray();
}