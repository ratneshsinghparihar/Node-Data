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

    private executeFindMany = (client, repo, message, multiClients?: any) => {
        return repo.findMany([message]).then((data: Array<any>) => {
            if (data && data.length) {
                if (multiClients && multiClients.length) {
                    multiClients.forEach((client) => { client.emit(repo.modelName(), data[0]); });
                }
                else {
                    client.emit(repo.modelName(), data[0]);
                }
                return data
            }
            return undefined
        }).catch((error) => {
            console.log("error in findmany socket emmitter", error);
            throw error;
        });
    }

    private sendMessageToclient = (client, repo, message, multiClients?: any) => {
        if (client.handshake.query && client.handshake.query.curSession) {
            var d = domain.create();
            d.run(() => {
                PrincipalContext.User = securityImpl.getContextObjectFromSession(client.handshake.query.curSession);
                //move to above 
                if (securityImpl.isAuthorize({ headers: client.handshake.query }, repo, "findMany")) {
                    this.executeFindMany(client, repo, message, multiClients);
                }


            });

        }
    }

    private initializeRepo(server?: any) {
        let self = this;
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


            var messenger = new Messenger({ retryInterval: 3000 });


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
                    if (meta && (meta.params.exportType == ExportTypes.ALL || meta.params.exportType == ExportTypes.WS || meta.params.exportType == ExportTypes.WS_BROAD_CAST )) {
                        messenger.on(key, function (message) {
                            if (meta.params.broadCastType && meta.params.broadCastType == ExportTypes.WS_BROAD_CAST) {
                                io.broadcast.to(key).emit(key, message);
                               // io.to(key).emit(message);
                                return;
                            }
                            // io.in(key).emit(key, message);

                            let broadcastClients: Array<any> = new Array<any>();
                            let messageSendStatistics: any = {};
                            let connectedClients = 0;
                            let broadCastClients = 0;
                            let reliableClients = 0;

                            var roomclients = io.sockets.adapter.rooms[key].sockets;   

                            for (let channelId in roomclients) {
                                
                                let client = io.sockets.connected[channelId];
                                if (!client) {
                                    continue;
                                }
                               

                                //if acl = false in security config
                                if (client.handshake.query && client.handshake.query.broadcastChannels &&
                                    client.handshake.query.broadcastChannels.filter((bchannel) => { return bchannel == key }).length > 0) {
                                    broadcastClients.push(client);
                                    broadCastClients++
                                    continue;
                                }
                                
                                if (message.receiver && message.receiver != channelId) {
                                    continue;
                                }

                                if (message.receiver) {
                                    delete message.receiver;
                                }

                                //call security to check if (enity(message), for user (client.handshake.query) , can read entity

                                connectedClients++;
                                self.sendMessageToclient(client, repo, message);
                                if (client.handshake.query && client.handshake.query.reliableChannles) {
                                    let channelArr: Array<string> = client.handshake.query.reliableChannles.split(",");
                                    reliableClients++;
                                    channelArr.forEach((rechannel) => {

                                        if (rechannel == key) {
                                            let query = client.handshake.query;
                                            let curSession = client.handshake.query.curSession;
                                            securityImpl.updateSession({
                                                netsessionid: query.netsessionid,
                                                channelName: rechannel,
                                                lastemit: messenger.lastMessageTimestamp,
                                                status: 'active'
                                            }, curSession);
                                        }
                                    });

                                }
                            }

                            if (broadcastClients && broadcastClients.length) {
                                self.sendMessageToclient(broadcastClients[0], repo, message, broadcastClients);
                            }

                            messageSendStatistics.connectedClients = connectedClients;
                            messageSendStatistics.broadCastClients = broadCastClients;
                            messageSendStatistics.reliableClients = reliableClients;
                            messageSendStatistics.channel = key;
                            messageSendStatistics.id = message._id && message._id.toString();
                            console.log("pub-sub message sent ", messageSendStatistics);
                        });
                    }
                }
                io.on('connection', function (socket) {
                    // this.socketClientholder.clients.push(client);



                    console.log('client connected', socket.id);
                    

                    if (socket.handshake.query) {
                        securityImpl.getSession(socket.handshake.query).then((session:any) => {
                            socket.handshake.query.curSession = session;
                            if (socket.handshake.query && socket.handshake.query.applicableChannels
                                && socket.handshake.query.applicableChannels.length) {
                                socket.handshake.query.applicableChannels.forEach((room) => {
                                    console.log("joined room", room);
                                    socket.join(room);
                                });
                            }
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
                                console.log("error in securityImpl.getSessionLastTimeStampForChannel", error);
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
