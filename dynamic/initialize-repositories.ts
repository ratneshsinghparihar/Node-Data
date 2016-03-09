import {DynamicSchema} from './dynamic-schema';
import * as Utils from "../decorators/metadata/utils";
import {MetaData} from '../decorators/metadata/metadata';

import {IDynamicRepository,DynamicRepository} from './dynamic-repository';
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';
import {searchUtils} from "../search/elasticSearchUtils";
import {Config} from '../config';
import {Decorators} from '../constants';

import {IRepositoryParams, IDocumentParams} from '../decorators/interfaces/meta-params';
import {repositoryMap} from './repositories';
import {mongooseSchemaMap} from './schemas';

import Mongoose = require("mongoose");
Mongoose.connect(Config.DbConnection);
var MongooseSchema = Mongoose.Schema;
var Enumerable: linqjs.EnumerableStatic = require('linq');

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
    constructor() {
        this.initializeRepo();
    }

    private initializeRepo() {
        let repositories = Utils.getMetaDataForDecoratorInAllTargets(Decorators.REPOSITORY);

        Enumerable.from(repositories)
            .forEach((x: { target: Object, metadata: Array<MetaData> }) => {
                if (!x.metadata || !x.metadata.length) {
                    return;
                }
                let params = <IRepositoryParams >x.metadata[0].params;
                let repositoryModel = Utils.getMetaData(params.model.prototype, Decorators.DOCUMENT);
                let schemaName = (<IDocumentParams>repositoryModel.params).name; // model name i.e. schema name
                let schema = new DynamicSchema(params.model, schemaName);
                let mongooseSchema = schema.getSchema();
                mongooseSchemaMap[(<any>x.target).path] = { schema: mongooseSchema, name: schema.schemaName, fn: x.target };
                mongooseNameSchemaMap[schema.schemaName] = mongooseSchema;
            });

        let repoMap: { [key: string]: { fn: Object, repo: IDynamicRepository } } = <any>{};
        for (var path in mongooseSchemaMap) {
            var schemaMapVal = mongooseSchemaMap[path];
            if (!schemaNameModel[schemaMapVal.name]) {
                schemaNameModel[schemaMapVal.name] = { entity: schemaMapVal.fn.model, model: Mongoose.model(schemaMapVal.name, schemaMapVal.schema) };
            }

            repoMap[path] = {
                fn: mongooseSchemaMap[path].fn,
                repo: new DynamicRepository(schemaMapVal.name, GetEntity(schemaMapVal.name), GetModel(schemaMapVal.name), schemaMapVal.fn)
            };
            searchUtils.registerToMongoosastic(repoMap[path].repo.getModel());
        }
        repositoryMap(repoMap);
    }
}