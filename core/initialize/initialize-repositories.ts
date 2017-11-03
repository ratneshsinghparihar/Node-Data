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

export class InitializeRepositories {
    private _schemaGenerator: ISchemaGenerator;
    private socketClientholder: { socket: any, clients: Array<any>, messenger: any } = { socket: {}, clients: [], messenger: {} };

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
                if (meta && meta[0] && x.metadata[0]) {
                    repoFromModel[meta[0].params.name] = newRepo;
                    newRepo.setMetaData(x.metadata[0]);
                }
                //searchMetaUtils.registerToMongoosastic(repoMap[path].repo.getModel());
            });

        if (server) {
            var io = require('socket.io')(server, { 'transports': ['websocket', 'polling'] });


            var messenger = new Messenger({ retryInterval: 100 });


            this.socketClientholder.socket = io;
            this.socketClientholder.messenger = messenger;
            for (let key in repoMap) {
                let repo = repoMap[key].repo;
                let meta: MetaData = repo.getMetaData();
                if (meta && (meta.params.exportType == ExportTypes.ALL || meta.params.exportType == ExportTypes.WS)) {
                    repo.setSocket(this.socketClientholder);
                    messenger.subscribe(key, true);
                }
            }

            // connect() begins "tailing" the collection 
            messenger.onConnect(function () {
                // emits events for each new message on the channel 

                for (let key in repoMap) {
                    let repo = repoMap[key].repo;
                    let meta: MetaData = repo.getMetaData();
                    if (meta && (meta.params.exportType == ExportTypes.ALL || meta.params.exportType == ExportTypes.WS)) {
                        messenger.on(key, function (message) {
                            console.log(key, message);
                            //io.sockets.emit(key, message);
                            // io.in(key).emit(key, message);
                            for (let channelId in io.sockets.connected) {
                                if (message.receiver && message.receiver != channelId) {
                                    continue;
                                }

                                if (message.receiver) {
                                    delete message.receiver;
                                }

                                let client = io.sockets.connected[channelId];

                                //call security to check if (enity(message), for user (client.handshake.query) , can read entity
                                if (client.handshake.query && client.handshake.query.curSession) {
                                    var d = domain.create();
                                    d.run(() => {
                                        PrincipalContext.User = securityImpl.getContextObjectFromSession(client.handshake.query.curSession);
                                        if (securityImpl.isAuthorize({ headers: client.handshake.query}, repo, "findMany")) {
                                            repo.findMany([message]).then((data: Array<any>) => {
                                                if (data && data.length) {
                                                    client.emit(key, data[0]);
                                                }
                                            }).catch((error) => {
                                                console.log("error in findmany socket emmitter", error);
                                            });
                                        }

                                       
                                    });

                                }
                                if (client.handshake.query && client.handshake.query.reliableChannles) {
                                    let channelArr: Array<string> = client.handshake.query.reliableChannles.split(",");

                                    channelArr.forEach((rechannel) => {

                                        if (rechannel == key) {
                                            let query = client.handshake.query;
                                            let curSession = client.handshake.query.curSession;
                                            securityImpl.updateSession({
                                                netsessionid: query.netsessionid,
                                                channelName: rechannel,
                                                lastemit: new Date(),
                                                status: 'active'
                                            }, curSession);
                                        }
                                    });

                                }
                            }
                        });
                    }
                }
                io.on('connection', function (socket) {
                    // this.socketClientholder.clients.push(client);



                    console.log('client connected', socket.id);

                    if (socket.handshake.query) {
                        securityImpl.getSession(socket.handshake.query).then((session) => {
                            socket.handshake.query.curSession = session;
                        }).catch((error) => {
                            console.log("error in getSession", error);
                        });
                    }

                    //emitt pending messages 
                    //fetch last timestam of client for each reliable channel
                    if (socket.handshake.query && socket.handshake.query.reliableChannles) {
                        let channelArr: Array<string> = socket.handshake.query.reliableChannles.split(",");

                        channelArr.forEach((rechannel) => {
                            securityImpl.getSessionLastTimeStampForChannel(socket.handshake.query, rechannel).then((lastemit) => {
                                if (lastemit) {
                                    //for each chnnel ask messeger the send an array of pending message
                                   
                                    messenger.sendPendingMessage(rechannel, lastemit, socket.id);

                                    //use socket.emitt to send previous message
                                }
                            }).catch((error) => {
                                console.log("error in securityImpl.getSessionLastTimeStampForChannel",error);
                            });
                        }
                        )
                    }


                    socket.on('disconnect', function () {
                        console.log('client disconnected', socket.id);
                    });

                    for (let key in repoMap) {
                        let repo = repoMap[key].repo;
                        let meta: MetaData = repo.getMetaData();
                        if (meta && (meta.params.exportType == ExportTypes.ALL || meta.params.exportType == ExportTypes.WS)) {
                            socket.on(key, function (data) {
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

                    }
                });
            });



        }

        repositoryMap(repoMap);
    }
}
