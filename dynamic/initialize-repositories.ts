import {DynamicSchema} from './dynamic-schema';
import * as Utils from "../decorators/metadata/utils";
import {MetaData} from '../decorators/metadata/metadata';

import {IDynamicRepository,DynamicRepository} from './dynamic-repository';
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';
import {searchUtils} from "../search/elasticSearchUtils";

export var mongooseRepoMap: { [key: string]: { fn: Function, repo: IDynamicRepository } } = { };
export var  mongooseSchemaMap: { [key: string]: { schema: any, name: string, fn: any } } = { };
export var mongooseNameSchemaMap: { [key: string]: any } = {};

export class InitializeRepositories {
    constructor(repositories: Array<Function>) {
        this.initializeRepo(repositories);
    }
        private schemas: { [key: string]: DynamicSchema } = {};
        private parsedSchema: { [key: string]: any} = {};


    private initializeRepo(repositories: Array<Function>) {
        repositories.forEach((value, index) => {
                var schemaName = Utils.getMetaData(value.prototype.model.prototype, "document").params['name']; // model name i.e. schema name
                var schema = new DynamicSchema(value.prototype.model.prototype, schemaName);
                this.schemas[value.prototype.path] = schema;
                this.parsedSchema[schema.schemaName] = schema;
        });

        //this.resolveMongooseRelation();

        repositories.forEach((value, index) => {
                var schema: DynamicSchema = this.schemas[value.prototype.path];
                var mongooseSchema = schema.getSchema();
                
                mongooseSchemaMap[value.prototype.path] = { schema: mongooseSchema, name: schema.schemaName, fn: value };
                mongooseNameSchemaMap[schema.schemaName] = mongooseSchema;
        });


        for (var path in mongooseSchemaMap) {
            var schemaMapVal = mongooseSchemaMap[path];
            mongooseRepoMap[path] = {
                fn: mongooseSchemaMap[path].fn,
                repo: new DynamicRepository(schemaMapVal.name, schemaMapVal.fn.prototype.model, schemaMapVal.schema,schemaMapVal.fn.prototype)
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