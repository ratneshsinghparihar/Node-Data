import {DynamicSchema} from './dynamic-schema';
import {repositoryMap} from '../core/exports';
import {MetaUtils} from '../core/metadata/utils';
import {Decorators as CoreDecorators} from '../core/constants';
import {Decorators} from './constants';
import {MongooseService} from './mongoose-service';
import * as Utils from '../core/utils';
import {IDocumentParams} from './decorators/interfaces/document-params';
import {IRepositoryParams} from '../core/decorators/interfaces/repository-params';
import {updateModelEntity, pathRepoMap, getModel} from '../core/dynamic/model-entity';
import Mongoose = require('mongoose');

export function generateSchema() {

    // register mongoose service
    Utils.entityService(Decorators.DOCUMENT, new MongooseService());

    var documents = MetaUtils.getMetaDataForDecorators([CoreDecorators.DOCUMENT]);
    documents.forEach(x => {
        let documentMeta = x.metadata[0];
        let schemaName = (<IDocumentParams>documentMeta.params).name;
        let schema = new DynamicSchema(documentMeta.target, schemaName);
        let mongooseSchema = schema.getSchema();
        let model = Mongoose.model(schemaName, <any>mongooseSchema);
        updateModelEntity(schemaName, documentMeta.target, model);
    });

    var repositoryMetadata = MetaUtils.getMetaDataForDecorators([CoreDecorators.REPOSITORY]);
    repositoryMetadata.forEach(x => {
        if (!x.metadata || !x.metadata.length) {
            return;
        }
        let repositoryParams = <IRepositoryParams>x.metadata[0].params;
        let entity = (<IRepositoryParams>x.metadata[0].params).model;
        let meta = MetaUtils.getMetaData(entity, Decorators.DOCUMENT);
        if (meta.length > 0) {
            let documentMeta = meta[0];
            if (documentMeta) {
                let schemaName = (<IDocumentParams>documentMeta.params).name;
                pathRepoMap[repositoryParams.path] = { schemaName: schemaName, modelType: Decorators.DOCUMENT};

            }
        }
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