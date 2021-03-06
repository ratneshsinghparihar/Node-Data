﻿import Mongoose = require('mongoose');

//import aa = require('mongoose');
import * as Enumerable from 'linq';
import * as Types from './datatype';
import { Strict } from './enums/document-strict';
import { Decorators } from '../core/constants/decorators';
import { MetadataConstants } from '../core/constants';

import { IMongooseSchemaOptions, schemaGenerator } from "./mongooseSchemaGenerator";

import { DecoratorType } from '../core/enums/decorator-type';
import { MetaUtils,resetFieldDecoratorCache} from "../core/metadata/utils";
import { MetaData } from '../core/metadata/metadata';
import { IDocumentParams } from './decorators/interfaces/document-params';
import { StorageType } from "../core/enums/index";
export var _arrayPropListSchema: { [key: string]: Array<any> } = {};

export class DynamicSchema {
    parsedSchema: any;
    schemaName: string;
    private target: Object;

    constructor(target: Object, name: string) {
        this.target = target;
        this.schemaName = name;
        this.parsedSchema = this.parse(target);
    }

    public getSchema() {
        var fieldMetaArr = MetaUtils.getMetaData(this.target, Decorators.FIELD);
        resetFieldDecoratorCache();
        var idx = Enumerable.from(fieldMetaArr)
            .where((keyVal) => keyVal && keyVal.params && (keyVal.params).searchIndex).any();
        var options = this.getMongooseOptions(this.target);
        var mongooseOptions: IMongooseSchemaOptions = { options: options, searchIndex: idx };
        return schemaGenerator.createSchema(this.parsedSchema, mongooseOptions);
    }

    private parse(target: Object) {
        if (!target || !(target instanceof Object)) {
            throw TypeError;
        }
        var schema = {};
        var primaryKeyProp;
        var metaDataMap = this.getAllMetadataForSchema(target);
        let arrayProps = [];
        for (var field in metaDataMap) {
            // Skip autogenerated primary column
            //if (prop === primaryKeyProp) {
            //    continue;
            //}

            var fieldMetadata: MetaData = <MetaData>metaDataMap[field];
            if (fieldMetadata.params && (<any>fieldMetadata.params).primary) {
                let type = fieldMetadata.getType();
                if (type == Object) // skip if the type is object type, in this case primary key will be mongoID
                    continue;
            }

            // add array props in _arrayPropListSchema dictonary.
            if (fieldMetadata.propertyType.isArray && !this.isJsonMapTypeProp(fieldMetadata)) {
                arrayProps.push(field);
            }

            if (fieldMetadata.decoratorType !== DecoratorType.PROPERTY) {
                continue;
            }

            if (fieldMetadata.params && (<any>fieldMetadata.params).searchIndex) {
                schema[field] = this.getSearchSchemaTypeForParam(fieldMetadata);
            }
            else {
                schema[field] = this.getSchemaTypeForParam(fieldMetadata);
            }
        }
        _arrayPropListSchema[this.schemaName] = arrayProps;
        return schema;
    }

    private getSearchSchemaTypeForParam(fieldMetadata: MetaData): any {
        var schemaType = this.getSchemaTypeForType(fieldMetadata.getType());
        if (fieldMetadata.params && fieldMetadata.params.rel) {
            return fieldMetadata.propertyType.isArray ? [schemaType] : schemaType;
        }
        else {
            return fieldMetadata.propertyType.isArray ? [schemaType] : { type: schemaType, es_indexed: true };
        }
        //var schemaType = this.getSchemaTypeForType(paramType);
        //if (paramType.rel) {
        //    //var metaData = Utils.getPrimaryKeyMetadata(paramType.itemType);
        //    //var relSchema;
        //    //if ((<any>fieldMetadata.params).embedded) {
        //    //    schema[field] = paramType.isArray ? [Types.Mixed] : Mongoose.Schema.Types.Mixed;
        //    //} else {
        //    //    relSchema = { ref: paramType.rel, type: Mongoose.Schema.Types.ObjectId };
        //    //    schema[field] = paramType.isArray ? [relSchema] : relSchema;
        //    //}

        //    // need to handle embedding vs foreign key refs
        //    return paramType.isArray ? [schemaType] : schemaType;
        //}
        //return paramType.isArray ? [schemaType] : {type : schemaType, es_indexed : true};
    }

    private getSchemaTypeForParam(fieldMetadata: MetaData) {
        var schemaType = this.getSchemaTypeForType(fieldMetadata.getType());
        return fieldMetadata.propertyType.isArray ? (this.isJsonMapTypeProp(fieldMetadata) ? <any>{} : [schemaType]) : schemaType;
        //var schemaType = this.getSchemaTypeForType(paramType.itemType);
        //if (paramType.rel) {
        //    //var metaData = Utils.getPrimaryKeyMetadata(paramType.itemType);
        //    //var relSchema;
        //    //if ((<any>fieldMetadata.params).embedded) {
        //    //    schema[field] = paramType.isArray ? [Types.Mixed] : Mongoose.Schema.Types.Mixed;
        //    //} else {
        //    //    relSchema = { ref: paramType.rel, type: Mongoose.Schema.Types.ObjectId };
        //    //    schema[field] = paramType.isArray ? [relSchema] : relSchema;
        //    //}

        //    // need to handle embedding vs foreign key refs
        //    return paramType.isArray ? [schemaType] : schemaType;
        //}
        //return paramType.isArray ? [schemaType] : schemaType;
    }

    private getSchemaTypeForType(type?): any {
        switch (type) {
            case Mongoose.Types.ObjectId: return Mongoose.Schema.Types.ObjectId;
            case String: return String;
            case Number: return Number;
            case Buffer: return Buffer;
            case Date: return Date;
            case Boolean: return Boolean;
            case Array: return Array;
            //case undefined: return Mongoose.Schema.Types.Mixed;
            // any or no types
            case Object:
            default: return Mongoose.Schema.Types.Mixed;
        }
    }

    private getMongooseOptions(target: Object) {
        var meta = MetaUtils.getMetaData(<any>target, Decorators.DOCUMENT);
        var documentMeta = meta[0];
        var options = <any>{};
        var params = <IDocumentParams>(documentMeta.params || <any>{});
        switch (params.strict) {
            case Strict.true: options.strict = true; break;
            case Strict.false: options.strict = false; break;
            case Strict.throw: options.strict = "throw"; break;
            default: options.strict = true; break;
        }
        if (params.pluralization == false) {
            options.pluralization = false;
        }
        return options;
    }

    private isSchemaDecorator(decorator: string) {
        return decorator === Decorators.FIELD || decorator === Decorators.ONETOMANY || decorator === Decorators.MANYTOONE || decorator === Decorators.MANYTOMANY || decorator === Decorators.ONETOONE;
    }

    private getAllMetadataForSchema(target: Object): { [key: string]: MetaData } {
        var metaDataMap: Array<MetaData> = MetaUtils.getMetaData(<any>target);
        var metaDataMapFiltered: { [key: string]: MetaData } = <any>{};
        for (var i in metaDataMap) {
            var meta: MetaData = metaDataMap[i] as MetaData;

            if (!this.isSchemaDecorator(meta.decorator))
                continue;

            if (metaDataMapFiltered[meta.propertyKey])
                throw "A property cannot have more than one schema decorator";

            metaDataMapFiltered[meta.propertyKey] = meta;
        }
        return metaDataMapFiltered;
    }

    private isJsonMapTypeProp(fieldMetadata: MetaData) {
        if (!fieldMetadata.params) {
            return false;
        }
        return fieldMetadata.params.storageType === StorageType.JSONMAP;
    }

}