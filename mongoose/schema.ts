import {DynamicSchema} from './dynamic-schema';
import {repositoryMap} from '../core/exports';
import {MetaUtils} from '../core/metadata/utils';
import {Decorators as CoreDecorators, MetadataConstants} from '../core/constants';
import {Decorators} from './constants';
import {IDocumentParams} from './decorators/interfaces/document-params';
import {IRepositoryParams} from '../core/decorators/interfaces/repository-params';
import {updateModelEntity} from '../core/dynamic/model-entity';
import Mongoose = require('mongoose');

export var pathRepoMap: { [key: string]: { schemaName: string, mongooseModel: any } } = <any>{};

export function generateSchema() {
    var repositoryMetadata = MetaUtils.getMetaDataForDecorators([CoreDecorators.REPOSITORY]);
    repositoryMetadata.forEach(x => {
        if (!x.metadata || !x.metadata.length) {
            return;
        }
        let repositoryParams = <IRepositoryParams>x.metadata[0].params;
        let entity = (<IRepositoryParams>x.metadata[0].params).model;
        let documentMeta = MetaUtils.getMetaData(entity, Decorators.DOCUMENT, null);
        let schemaName = (<IDocumentParams>documentMeta.params).name;
        let schema = new DynamicSchema(documentMeta.target, (<IDocumentParams>x.metadata[0].params).name);
        let mongooseSchema = schema.getSchema();
        let model = Mongoose.model(schemaName, <any>mongooseSchema);
        pathRepoMap[repositoryParams.path] = { schemaName: schemaName, mongooseModel: model };

        updateModelEntity(schemaName, entity, model);
    });
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