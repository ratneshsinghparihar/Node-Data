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
import {DecoratorType} from '../enums/decorator-type';

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



export class InitializeRepositories {
    private _schemaGenerator: ISchemaGenerator;
    private socketClientholder: { socket: any, clients: Array<any>, messenger: any } = { socket: {}, clients: [], messenger: {} };
    private socketChannelGroups: any = {}; // key is channel name and values array of groups
    private sessionSocketIdMap = {}; //need to be handled the disconnection
    private socket: any;
    private allAutherizationRules: Array<{
        name: string;
        acl: Array<{ role: string, accessmask: number, acl?: boolean }>;
        isRepoAuthorize: boolean;
    }> = <Array<{
        name: string;
        acl: Array<{ role: string, accessmask: number, acl?: boolean }>;
        isRepoAuthorize: boolean;
    }>>(configUtils.securityConfig().SecurityConfig.ResourceAccess);

    private allAutherizationRulesMap: any = {};

    constructor(server?: any) {
        this.initializeRepo(server);
        if (this.allAutherizationRules && this.allAutherizationRules.length) {
            this.allAutherizationRules.forEach((rule) => {
                this.socketChannelGroups[rule.name] = {};
                let insideRulMap: any = {};
                if (rule && rule.acl && rule.acl.length) {
                    rule.acl.forEach((acl) => {
                        insideRulMap[acl.role] = acl;
                    })
                }
                this.allAutherizationRulesMap[rule.name] = insideRulMap;
            });
        }
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

    private getAllUsersForNotification = (entity: any) => {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var service:any = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == "authorizationService").select(x => x.metadata[0]).firstOrDefault();
        if (service) {
            return service.target.getAllUsersForNotification(entity);
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
                var metas = MetaUtils.getMetaDataFromDecoratorType(model, DecoratorType.MODEL);
                if (metas && metas[0] && x.metadata[0]) {
                    repoFromModel[metas[0].params.name] = newRepo;
                    newRepo.setMetaData(x.metadata[0]);
                }

               
                metas && metas[0] && (repoFromModel[metas[0].params.name] = newRepo);

                
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

                            //handle if repo is completly broadcast
                            let broadcastToAll = (castType: string) => {
                                let channelRoom = io.sockets.adapter.rooms[key];
                                if (channelRoom) {
                                    var roomclients = channelRoom.length;

                                    //io.sockets.emit(key, message);
                                    io.to(key).emit(key, message);
                                    //io.broadcast.to(key).emit(key, message);

                                    console.log("WS_BROAD_CAST", { "channle": key, "no_of_broadcasts": roomclients });
                                }
                            }

                            if (meta.params.broadCastType && meta.params.broadCastType == ExportTypes.WS_BROAD_CAST) {

                                broadcastToAll("WS_BROAD_CAST");
                               // io.to(key).emit(message);
                                return;
                            }
                            // io.in(key).emit(key, message);
                            //NO aACL define 
                            if (!self.allAutherizationRulesMap[key]) {
                                broadcastToAll("BROAD_CAST_NO_RULE");
                                return;
                            }

                            let messageSendStatistics: any = {};
                            let connectedClients = 0;
                            let broadCastClients = 0;
                            let reliableClients = 0;

                            

                            //handle broad cast group ..acl ==false

                            if (!self.socketChannelGroups[key]) {
                                return;
                            }

                            let updateReliableChannelSettings = (client) => {
                                reliableClients++;
                                let query = client.handshake.query;
                                let curSession = client.handshake.query.curSession;
                                securityImpl.updateSession({
                                    netsessionid: query.netsessionid,
                                    channelName: key,
                                    lastemit: messenger.lastMessageTimestamp,
                                    status: 'active'
                                }, curSession);}

                            for (let channleGroup in self.socketChannelGroups[key]) {
                                let isRealiableChannel = false;
                                let groupName = key + "_" + channleGroup;
                                if (self.socketChannelGroups[key][channleGroup]) {
                                    isRealiableChannel = self.socketChannelGroups[key][channleGroup];
                                    //groupName += "_RC";
                                }
                                 

                                let channelRoom = io.sockets.adapter.rooms[groupName];
                                if (!channelRoom) {
                                    continue;
                                }
                                var roomclients = channelRoom.sockets;
                                let broadcastClients: Array<any> = new Array<any>();
                               
                                for (let channelId in roomclients) {


                                    if (message.receiver && message.receiver != channelId) {
                                        continue;
                                    }

                                    if (message.receiver) {
                                        delete message.receiver;
                                    }


                                    let client = io.sockets.connected[channelId];
                                    if (!client) {
                                        continue;
                                    }
                                    broadcastClients.push(client);
                                    broadCastClients++
                                    connectedClients++;
                                    //under reliable channel
                                   
                                    if (isRealiableChannel) {
                                        updateReliableChannelSettings(client);
                                    }
                                }
                                if (broadcastClients && broadcastClients.length) {
                                    self.sendMessageToclient(broadcastClients[0], repo, message, broadcastClients);
                                }
                            }
                            //individual messages
                            let individualUsers = self.getAllUsersForNotification(message);
                            if (individualUsers && individualUsers.length) {
                                individualUsers.forEach((user: string) => {
                                    let channelId = self.sessionSocketIdMap[user];
                                    let client = io.sockets.connected[channelId];
                                    if (!client) {
                                        return;
                                    }
                                    connectedClients++;
                                    self.sendMessageToclient(client, repo, message);
                                    if (client.handshake.query && client.handshake.query.reliableChannles) {
                                        let channelArr: Array<string> = client.handshake.query.reliableChannles.split(",");
                                        if (channelArr.indexOf(key) > -1) {
                                            updateReliableChannelSettings(client);
                                        }
                                    }
                                });
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
                        securityImpl.getSession(socket.handshake.query).then((session:Session) => {
                            socket.handshake.query.curSession = session;
                            self.sessionSocketIdMap[session.userId] = socket.id;
                            if (socket.handshake.query && socket.handshake.query.applicableChannels
                                && socket.handshake.query.applicableChannels.length) {
                                socket.handshake.query.applicableChannels.forEach((room) => {
                                    if (room && room.name) {
                                        console.log("joined room", room.name);
                                        socket.join(room.name);
                                        if (!self.socketChannelGroups[room.name]) { self.socketChannelGroups[room.name] = {}}
                                    }
                                });
                            }
                            
                            if (socket.handshake.query && socket.handshake.query.broadcastChannels
                                && socket.handshake.query.broadcastChannels.length) {
                                socket.handshake.query.broadcastChannels.forEach((room) => {
                                    if (room && room.name && room.group) {
                                        if (socket.handshake.query && socket.handshake.query.reliableChannles) {
                                            let channelArr: Array<string> = socket.handshake.query.reliableChannles.split(",");
                                            if (channelArr.indexOf(room.name) > -1) {
                                                console.log("joined room group with reliable session", room.name + "_" + room.group + "_RC");
                                                socket.join(room.name + "_" + room.group + "_RC");
                                                if (!self.socketChannelGroups[room.name][room.group + "_RC"]) { self.socketChannelGroups[room.name][room.group + "_RC"] = true }
                                                return;
                                            }
                                        }
                                        console.log("joined room group", room.name + "_" + room.group);
                                        if (!self.socketChannelGroups[room.name][room.group]) { self.socketChannelGroups[room.name][room.group] = false }
                                        socket.join(room.name + "_" + room.group);
                                    }
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
                        if (socket.handshake.query.curSession) {
                            delete self.sessionSocketIdMap[socket.handshake.query.curSession.userId];
                        }
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
