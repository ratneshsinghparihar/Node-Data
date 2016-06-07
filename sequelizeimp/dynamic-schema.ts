import Mongoose = require('mongoose');
import * as Sequelize from "sequelize";
//import aa = require('mongoose');
var Enumerable: linqjs.EnumerableStatic = require('linq');
import * as Types from './datatype';
import {Strict} from './enums/entity-strict';
import {Decorators} from '../core/constants/decorators';
import {MetadataConstants} from '../core/constants';

import {DecoratorType} from '../core/enums/decorator-type';
import {MetaUtils} from "../core/metadata/utils";
import {MetaData} from '../core/metadata/metadata';
import {IEntityParams} from './decorators/interfaces/entity-params';
import {sequelizeService} from './sequelizeService';

export class DynamicSchema {
    parsedSchema: any;
    schemaName: string;
    private target: Object;
    private _tablespecs: any;
    private _schema: any;
    private _relations: any = {};

    constructor(target: Object, name: string,tableSpecs:any) {
        this.target = target;
        this.schemaName = name;
        this.parsedSchema = this.parse(target);
        this._tablespecs = tableSpecs;
        this._schema = sequelizeService.addScheam(this.schemaName, this.parsedSchema, this._tablespecs);
    }

    public getSchema() {
        return this._schema;
    }

    public getRelations() {
        return this._relations;
    }

    public getTarget() {
        return this.target;
    }

    private parse(target: Object) {
        if (!target || !(target instanceof Object)) {
            throw TypeError;
        }
        var schema = {};
        var primaryKeyProp;
        //var metaDataMap = this.getAllMetadataForSchema(target);
        var metaDataMap = MetaUtils.getMetaData(this.target, Decorators.COLUMN);
        for (var field in metaDataMap) {
            var fieldMetadata: MetaData = <MetaData>metaDataMap[field];
            var name = fieldMetadata.params.name;
            var params = fieldMetadata.params;
            delete params.name;
            schema[name] = params;
        }

        var metaDataMap1 = MetaUtils.getMetaData(this.target, Decorators.ONETOMANY);
        var oneTomanyrels = [];
        for (var field in metaDataMap1) {
            var fieldMetadata: MetaData = <MetaData>metaDataMap1[field];           

            var params = fieldMetadata.params;
            params.propertyKey = fieldMetadata.propertyKey;
            oneTomanyrels.push(params);
        }
        this._relations[Decorators.ONETOMANY] = oneTomanyrels;

        var metaDataMap2 = MetaUtils.getMetaData(this.target, Decorators.MANYTOONE);
        var manytoonerels = [];
        for (var field in metaDataMap2) {
            var fieldMetadata: MetaData = <MetaData>metaDataMap2[field];

            var params = fieldMetadata.params;
            params.propertyKey = fieldMetadata.propertyKey;
            manytoonerels.push(params);
        }
        this._relations[Decorators.MANYTOONE] = manytoonerels;


        return schema;
    }

    private getSearchSchemaTypeForParam(fieldMetadata: MetaData) {
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
        return fieldMetadata.propertyType.isArray ? [schemaType] : schemaType;
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

    private getSchemaTypeForType(type?) {
        switch (type) {
            case Mongoose.Types.ObjectId: return Mongoose.Schema.Types.ObjectId;
            case String: return Sequelize.STRING(128);
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
        var meta = MetaUtils.getMetaData(<any>target, Decorators.ENTITY);
        var entityMeta = meta[0];
        var options = <any>{};
        var params = <IEntityParams>(entityMeta.params || <any>{});
        options.strict = true;
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
}