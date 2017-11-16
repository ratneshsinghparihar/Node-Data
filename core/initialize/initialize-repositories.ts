import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import * as mongooseUtils from '../../mongoose/utils';
import {MetaData} from '../metadata/metadata';
import {ExportTypes} from '../constants/decorators';
import {IDynamicRepository, DynamicRepository} from '../dynamic/dynamic-repository';
import {InstanceService} from '../services/instance-service';
import {ParamTypeCustom} from '../metadata/param-type-custom';
import {searchUtils} from "../../search/elasticSearchUtils";
var Config = Utils.config();
import {Decorators} from '../constants';

import {IRepositoryParams} from '../decorators/interfaces';
import {repositoryMap} from '../exports/repositories';

import {ISchemaGenerator} from '../interfaces/schema-generator';
import * as Enumerable from 'linq';
import {repoFromModel} from '../dynamic/model-entity';

export var mongooseNameSchemaMap: { [key: string]: any } = {};

import * as securityImpl from '../dynamic/security-impl';
var domain = require('domain');

var Messenger = require('../../mongoose/pubsub/messenger');
import {PrincipalContext} from '../../security/auth/principalContext';
import {Session} from  '../../models/session';
import * as configUtils from '../utils';

export var repoMap: { [key: string]: { fn: Object, repo: IDynamicRepository } } = <any>{};

export class InitializeRepositories {
  

    constructor(server?: any) {
        this.initializeRepo();
       
    }

   

    private initializeRepo() {
        let self = this;
        let repositories = MetaUtils.getMetaDataForDecorators([Decorators.REPOSITORY]);

        




        Enumerable.from(repositories)
            .forEach((x: { target: Object, metadata: Array<MetaData> }) => {
                if (!x.metadata || !x.metadata.length) {
                    return;
                }
                //let params = <IRepositoryParams>x.metadata[0].params;
                //let repositoryModel = MetaUtils.getMetaData(params.model.prototype, Decorators.DOCUMENT);
                //let schemaName = (<IDocumentParams>repositoryModel.params).name; // model name i.e. schema name
                //let schema = new DynamicSchema(params.model, schemaName);
                //let mongooseSchema = schema.getSchema();
                //mongooseSchemaMap[(<any>x.target).path] = { schema: mongooseSchema, name: schema.schemaName, fn: x.target };
                //mongooseNameSchemaMap[schema.schemaName] = mongooseSchema;

                let path = (<any>x.target).path;
                let repoParams = <IRepositoryParams>x.metadata[0].params;
                let model = repoParams.model;
                let newRepo: DynamicRepository;
                let rootRepo = new DynamicRepository();
                rootRepo.initialize(repoParams.path, x.target, model);



                if (x.target instanceof DynamicRepository) {
                    newRepo = <DynamicRepository>InstanceService.getInstance(x.target, null, null);
                }
                else {
                    newRepo = rootRepo;
                }
                newRepo.initialize(repoParams.path, x.target, model, rootRepo);

                repoMap[path] = {
                    fn: x.target,
                    repo: newRepo
                };
                var meta = MetaUtils.getMetaData(model, Decorators.DOCUMENT);
                if (meta && meta[0] && x.metadata[0]) {
                    repoFromModel[meta[0].params.name] = newRepo;
                    newRepo.setMetaData(x.metadata[0]);
                }

               
                meta && meta[0] && (repoFromModel[meta[0].params.name] = newRepo);

                
                //searchMetaUtils.registerToMongoosastic(repoMap[path].repo.getModel());
            });

        

        repositoryMap(repoMap);
    }
}
