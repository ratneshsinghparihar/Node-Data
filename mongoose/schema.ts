import {DynamicSchema} from './dynamic-schema';
import {repositoryMap} from '../core/exports';
import * as MetaUtils from '../core/metadata/utils';
import {Decorators as CoreDecorators} from '../core/constants';
import {Decorators} from './constants';
import {IDocumentParams} from './decorators/interfaces/document-params';
import {IRepositoryParams} from '../core/decorators/interfaces/repository-params';
import Mongoose = require('mongoose');

export var pathRepoMap: { [key: string]: { schemaName: string, mongooseModel: any } } = <any>{};
var schemaNameModel: { [key: string]: any } = {};

export function getEntity(schemaName: string): any {
    if (!schemaNameModel[schemaName])
        return null;

    return schemaNameModel[schemaName]['entity'];
}

export function getModel(schemaName: string): any {
    if (!schemaNameModel[schemaName])
        return null;

    return schemaNameModel[schemaName]['model'];
}

export function generateSchema() {
    var repositoryMetadata = MetaUtils.getMetaDataForDecoratorInAllTargets(CoreDecorators.REPOSITORY);
    repositoryMetadata.forEach(x => {
        if (!x.metadata || !x.metadata.length) {
            return;
        }
        let repositoryParams = <IRepositoryParams>x.metadata[0].params;
        let entity = (<IRepositoryParams>x.metadata[0].params).model;
        let documentMeta = MetaUtils.getMetaData(entity, Decorators.DOCUMENT);
        let schemaName = (<IDocumentParams>documentMeta.params).name;
        let schema = new DynamicSchema(documentMeta.target, (<IDocumentParams>x.metadata[0].params).name);
        let mongooseSchema = schema.getSchema();
        let model = Mongoose.model(schemaName, <any>mongooseSchema);
        pathRepoMap[repositoryParams.path] = { schemaName: schemaName, mongooseModel: model };

        if (!schemaNameModel[schemaName]) {
            schemaNameModel[schemaName] = { entity: entity, model: model };
        }
    });
}