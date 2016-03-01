/// <reference path="../typings/mongoose/mongoose.d.ts" />

import {DynamicSchema} from './dynamic-schema';
import * as Utils from "../decorators/metadata/utils";
import {MetaData} from '../decorators/metadata/metadata';

import {IDynamicRepository,DynamicRepository} from './dynamic-repository';
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';
import {searchUtils} from "../search/elasticSearchUtils";
import {Config} from '../config';

import Mongoose = require("mongoose");
Mongoose.connect(Config.DbConnection);
var MongooseSchema = Mongoose.Schema;

export var mongooseRepoMap: { [key: string]: { fn: Function, repo: IDynamicRepository } } = { };
export var mongooseSchemaMap: { [key: string]: { schema: any, name: string, fn: any } } = { };
export var mongooseNameSchemaMap: { [key: string]: any } = {};
var schemaNameModel: { [key: string]: any } = {};

export function GetEntity(schemaName: string): any {
    if (!schemaNameModel[schemaName])
        return null;

    return schemaNameModel[schemaName]['entity'];
}

export function GetModel(schemaName: string): any {
    if (!schemaNameModel[schemaName])
        return null;

    return schemaNameModel[schemaName]['model'];
}

export class InitializeRepositories {
    constructor(repositories: Array<Function>) {
        this.initializeRepo(repositories);
    }

    private initializeRepo(repositories: Array<Function>) {
        repositories.forEach((value, index) => {
                var schemaName = Utils.getMetaData(value.prototype.model.prototype, "document").params['name']; // model name i.e. schema name
                var schema = new DynamicSchema(value.prototype.model.prototype, schemaName);
                var mongooseSchema = schema.getSchema();
                mongooseSchemaMap[value.prototype.path] = { schema: mongooseSchema, name: schema.schemaName, fn: value };
                mongooseNameSchemaMap[schema.schemaName] = mongooseSchema;
        });

        for (var path in mongooseSchemaMap) {
            var schemaMapVal = mongooseSchemaMap[path];
            if (!schemaNameModel[schemaMapVal.name]) {
                schemaNameModel[schemaMapVal.name] = { entity: schemaMapVal.fn.prototype.model, model: Mongoose.model(schemaMapVal.name, schemaMapVal.schema) };
            }

            mongooseRepoMap[path] = {
                fn: mongooseSchemaMap[path].fn,
                repo: new DynamicRepository(schemaMapVal.name, GetEntity(schemaMapVal.name), GetModel(schemaMapVal.name), schemaMapVal.fn.prototype)
            };
            searchUtils.registerToMongoosastic(mongooseRepoMap[path].repo.getModel());
        }
    }

    private resolveMongooseRelation() {
        //for (var schemaName in this.parsedSchema) {
        //    this.resolveRelation(schemaName);
        //}
        //for (var key in parsedSchema) {
            //schemas[key].parsedSchema = this.appendReltaion(schemas[key].parsedSchema, [schemas[key].schemaName], -1, 0, parsedSchema, true);
        //}
    }

    //private resolveRelation(schemaName) {
    //    if (this.parsedSchema[schemaName].resolved) {
    //        return;
    //    }
    //    for (var relName in this.parsedSchema[schemaName].schema) {
    //        if (!relName.ref) {
    //            continue;
    //        }
    //        var metaData:Utils.MetaData = relName.metaData;
    //        var params = relName.metaData.params;
    //        if (!params) {
    //            continue;
    //        }
    //        if (params.embedded) {
    //            var relSchema = { ref: relName.ref, type: {} };
    //            this.parsedSchema[schemaName].schema[relName] = metaData.propertyType.isArray ? [relSchema] : relSchema;
    //        } else {
    //            var relSchema = { ref: relName.ref, type: {} };
    //            this.parsedSchema[schemaName].schema[relName] = metaData.propertyType.isArray ? [relSchema] : relSchema;
    //        }
    //        var relSchema = this.parsedSchema[relName];
    //        var curSchemaResolutionPair = this.parsedSchema[schemaName];

    //        if (!this.parsedSchema[relName].resolved) {
    //            this.resolveRelation(relName);
    //        }
    //        this.parsedSchema[schemaName].schema[relName] = this.parsedSchema[relName];
    //    }
    //}

    //private appendReltaion(node: { [key: string]: any }, visited: [string], depth: number, level: number, models: { [key: string]: DynamicSchema }, rootNode: boolean): {} {
    //    if (depth === level) {
    //        return;
    //    }
    //    var schem = {};
    //    for (var key in node) {
    //        if (node[key].ref) {
    //            var metaData = <MetaData>node[key].metaData;
    //            var param = metaData.propertyType;
    //            var primaryKey = Utils.getPrimaryKeyOfModel(param.itemType);
    //            var primaryKeyType = Utils.getMetaDataForField(metaData.target, primaryKey).propertyType.itemType;
    //            primaryKeyType = primaryKeyType ? primaryKeyType : String; // If undefined then use string
    //            var isEmbedded = false;

    //            // update schema with primary key if same object is encountered
    //            if (visited.indexOf(param.rel) > -1) {
    //                schem[key] = param.isArray ? [primaryKeyType] : primaryKeyType;
    //            }
    //            else {
    //                if (!param.embedded) {
    //                    schem[key] = param.isArray ? [primaryKeyType] : primaryKeyType;
    //                }
    //                else {
    //                    isEmbedded = true;
    //                    visited.push(param.rel);
    //                    var ret = {};
    //                    if (rootNode) {
    //                        ret = this.appendReltaion(models[param.rel].parsedSchema, visited, param.level, 0, models, false);
    //                    }
    //                    else {
    //                        ret = this.appendReltaion(models[param.rel].parsedSchema, visited, depth, level + 1, models, false);
    //                    }

    //                    // check if array
    //                    schem[key] = param.isArray ? [ret] : ret;
    //                    var name = visited.pop();
    //                }
    //            }
    //            //Utils.updateModelLinks(metaData, isEmbedded);
    //        }
    //        else {
    //            schem[key] = node[key];
    //        }
    //    }
    //    return schem;
    //}
}