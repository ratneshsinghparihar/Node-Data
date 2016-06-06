/// <reference path="../core/dynamic/dynamic-repository.ts" />
import {DynamicSchema} from './dynamic-schema';
import {repositoryMap} from '../core/exports';
import * as Utils from '../core/utils';
import {MetaUtils} from '../core/metadata/utils';
import {Decorators as CoreDecorators} from '../core/constants';
import {Decorators} from './constants';
import {IEntityParams} from './decorators/interfaces/entity-params';
import {IRepositoryParams} from '../core/decorators/interfaces/repository-params';
import {pathRepoMap, updateModelEntity, getModel} from '../core/dynamic/model-entity';
import Mongoose = require('mongoose');
var Enumerable: linqjs.EnumerableStatic = require('linq');
import {sequelizeService} from './sequelizeService';
import * as config from '../config';
import {GetRepositoryForName} from '../core/dynamic/dynamic-repository';

export function generateSchema() {
    if (config.SqlConfig.isSqlEnabled == false)
        return;

    // register entity service
    Utils.entityService(Decorators.ENTITY, sequelizeService);

    var entities = MetaUtils.getMetaDataForDecorators([CoreDecorators.ENTITY]);
    var allDynamicSchemas: Array<DynamicSchema> = new Array<DynamicSchema>();
    entities.forEach(x => {
        let entityMeta = x.metadata[0];
        let schemaName = (<IEntityParams>entityMeta.params).tableName;
        let schema = new DynamicSchema(entityMeta.target, schemaName, <IEntityParams>entityMeta.params);
        allDynamicSchemas.push(schema);
        let entitySchema = schema.getSchema();
        //let model = Mongoose.model(schemaName, <any>mongooseSchema);
        updateModelEntity(schemaName, entityMeta.target, entitySchema);
    });

    allDynamicSchemas.forEach(schema => {
        schema.getRelations()[CoreDecorators.ONETOMANY].forEach(oneToManyRelation => {
            let sourceDynamicSchema = schema;
            let targetDynamicSchema = Enumerable.from(allDynamicSchemas)
                .where(dynamicSchema => dynamicSchema.schemaName == oneToManyRelation.rel).first();
            sequelizeService.addRelationInSchema(sourceDynamicSchema.getSchema(), targetDynamicSchema.getSchema(), CoreDecorators.ONETOMANY, oneToManyRelation.rel, oneToManyRelation.propertyKey);
        });
    })

    allDynamicSchemas.forEach(schema => {
        schema.getRelations()[CoreDecorators.MANYTOONE].forEach(manyToOne => {
            let sourceDynamicSchema = schema;
            let targetDynamicSchema = Enumerable.from(allDynamicSchemas)
                .where(dynamicSchema => dynamicSchema.schemaName == manyToOne.rel).first();
            sequelizeService.addRelationInSchema(sourceDynamicSchema.getSchema(), targetDynamicSchema.getSchema(), CoreDecorators.MANYTOONE, manyToOne.rel, manyToOne.propertyKey);

        });
    })


    var repositoryMetadata = MetaUtils.getMetaDataForDecorators([CoreDecorators.REPOSITORY]);
    repositoryMetadata.forEach(x => {
        if (!x.metadata || !x.metadata.length) {
            return;
        }
        let repositoryParams = <IRepositoryParams>x.metadata[0].params;
        let entity = (<IRepositoryParams>x.metadata[0].params).model;
        let meta = MetaUtils.getMetaData(entity, Decorators.ENTITY);
        if (meta.length > 0) {
            let entityMeta = meta[0];
            if (entityMeta) {
                let schemaName = (<IEntityParams>entityMeta.params).tableName;
                pathRepoMap[repositoryParams.path] = { schemaName: schemaName, modelType: Decorators.ENTITY };
            }
        }
    });
    sequelizeService.init();
   
}
    // need to pass this via reference
//    var visitedNodes = new Map();

//    export function validateModels() {
//    var modelsMeta = metaUtils.getMetaDataForDecoratorInAllTargets(Decorators.DOCUMENT);
//    Enumerable.from(modelsMeta).forEach(x => {
//        var m: MetaData = x;
//        var res = this.hasLoop(m.target, new Array<MetaData>());
//        if (res) {
//            throw 'Cannot start server. Please correct the model ' + m.target.constructor.name;
//        }
//    });
//}

//    private function hasLoop(target: Object, vis: Array<MetaData>): boolean {
//        var rel = metaUtils.getAllRelationsForTargetInternal(target);
//        Enumerable.from(rel).forEach(y => {
//            var r: MetaData = <MetaData>y;
//            var param: IAssociationParams = <IAssociationParams>r.params;
//            if (param.embedded || param.eagerLoading) {
//                var res = false;
//                if (this.visitedNodes.has(r)) {
//                    // no need to go ahead, path from this node is already checked
//                    res = false;
//                }
//                else if (vis.indexOf(r) > -1) {
//                    // loop found
//                    res = true;
//                }
//                else {
//                    vis.push(r);
//                    this.visitedNodes.set(r, true);
//                    res = this.hasLoop(param.itemType, vis);
//                }

//                // if any loop 
//                if (res)
//                    return true;
//            }
//        });

//        return false;
//    }