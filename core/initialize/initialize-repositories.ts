import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import * as mongooseUtils from '../../mongoose/utils';
import {MetaData} from '../metadata/metadata';

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

export class InitializeRepositories {
    private _schemaGenerator: ISchemaGenerator;
    private socketClientholder: { socket: any, clients: Array<any>, messenger: any } = { socket: {}, clients: [], messenger: {}};

    private socket: any;
    constructor(server?: any) {
        this.initializeRepo(server);
    }

    public schemaGenerator(schemaGenerator: ISchemaGenerator) {
        this._schemaGenerator = schemaGenerator;
    }

    private initializeRepo(server?: any) {
        let repositories = MetaUtils.getMetaDataForDecorators([Decorators.REPOSITORY]);

        let repoMap: { [key: string]: { fn: Object, repo: IDynamicRepository } } = <any>{};

        


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
                rootRepo.initialize(repoParams.path, x.target, model, this.socket);

               

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
                meta && meta[0] && (repoFromModel[meta[0].params.name] = newRepo);
                //searchMetaUtils.registerToMongoosastic(repoMap[path].repo.getModel());
            });

        if (server) {
            var io = require('socket.io')(server, { 'transports': ['websocket', 'polling'] });
            var MessageQueue = require('mongoose-pubsub');
            var messenger = new MessageQueue({ retryInterval: 100 });


            this.socketClientholder.socket = io;
            this.socketClientholder.messenger = messenger;
            for (let key in repoMap) {
                let repo = repoMap[key].repo;
                repo.setSocket(this.socketClientholder);
                messenger.subscribe(key, true);
            }

            // connect() begins "tailing" the collection 
            messenger.connect(function () {
                // emits events for each new message on the channel 

                for (let key in repoMap) {

                    messenger.on(key, function (message) {
                        console.log(key, message);
                        io.sockets.emit(key, message);
                    });
                }
            });


            io.on('connection', function (client) {               
               // this.socketClientholder.clients.push(client);
                for (let key in repoMap) {
                    let repo = repoMap[key].repo;
                    client.on(key, function (data) {


                        var d = domain.create();
                        d.run(() => {
                            try {
                                let parsedData = data;
                                let executefun = () => {
                                    try {

                                        if (parsedData && parsedData.action && parsedData.message) {
                                            if (securityImpl.isAuthorize(parsedData, repo, parsedData.action)) {
                                                repo[parsedData.action](parsedData.message);
                                            }
                                        }
                                    } catch (exceptio) {
                                        console.log(exceptio);
                                    }
                                };
                                (<any>(securityImpl.ensureLoggedIn()(parsedData, undefined, executefun))).catch((err) => { console.log(err); });

                            }
                            catch (exc) {
                                console.log(exc);
                            }
                        });
                    });
                }
            });
        }

        //let repoMap: { [key: string]: { fn: Object, repo: IDynamicRepository } } = <any>{};
        //for (var path in mongooseSchemaMap) {
        //    var schemaMapVal = mongooseSchemaMap[path];
        //    if (!schemaNameModel[schemaMapVal.name]) {
        //        schemaNameModel[schemaMapVal.name] = { entity: schemaMapVal.fn.model, model: Mongoose.model(schemaMapVal.name, schemaMapVal.schema) };
        //    }

        //    repoMap[path] = {
        //        fn: mongooseSchemaMap[path].fn,
        //        repo: new DynamicRepository(schemaMapVal.name, GetEntity(schemaMapVal.name), GetModel(schemaMapVal.name), schemaMapVal.fn)
        //    };
        //    searchMetaUtils.registerToMongoosastic(repoMap[path].repo.getModel());
        //}
        repositoryMap(repoMap);
    }
}