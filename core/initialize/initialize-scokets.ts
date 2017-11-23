
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
import {inject} from '../../di/decorators/inject';

import {Messenger} from '../../mongoose/pubsub/messenger';
import {PrincipalContext} from '../../security/auth/principalContext';
import {Session} from  '../../models/session';
import * as configUtils from '../utils';
import {repoMap} from './initialize-repositories';

import * as Q from 'q';
const uuidv4 = require('uuid/v4');
import {IWorkerProcessService} from "../services/workerProcessService";
import {IWorkerProcess} from "../../models/IWorkerProcess";
import {IAutherizationParam} from "../../security/auth/autherizationParam";

export var allAutherizationRulesMap: any = {};


export class InitializeScokets {



    private _schemaGenerator: ISchemaGenerator;
    private socketClientholder: { socket: any, clients: Array<any>, messenger: any } = { socket: {}, clients: [], messenger: {} };
    private socketChannelGroups: any = {}; // key is channel name and values array of groups
    private sessionSocketIdMap = {}; //need to be handled the disconnection
    private socket: any;

    private messenger = new Messenger({ retryInterval: 3000 });
    private io = undefined;
    private channleMessangerMap: any = {};

    private serverId = uuidv4();

    private workerProcessService: IWorkerProcessService;

    private allAutherizationRules: Array<{
        name: string;
        acl: Array<IAutherizationParam>;
        isRepoAuthorize: boolean;
    }> = <Array<{
        name: string;
        acl: Array<IAutherizationParam>;
        isRepoAuthorize: boolean;
    }>>(configUtils.securityConfig().SecurityConfig.ResourceAccess);

    private allAutherizationRulesMap: any = {};

    // name.role :{ role: string, accessmask: number, acl?: boolean }
    private allSingleEmitterSettings: any = {}; // {repo.name} : Array<strings> roles
    constructor(server?: any) {

        if (this.allAutherizationRules && this.allAutherizationRules.length) {
            this.allAutherizationRules.forEach((rule) => {
                this.socketChannelGroups[rule.name] = {};
                let insideRulMap: any = {};
                if (rule && rule.acl && rule.acl.length) {
                    rule.acl.forEach((acl) => {
                        insideRulMap[acl.role] = acl;
                        if (acl.emitToSingleWorker) {
                            if (!this.allSingleEmitterSettings[rule.name]) {
                                this.allSingleEmitterSettings[rule.name] = [];
                            }
                            this.allSingleEmitterSettings[rule.name].push(acl.role);
                        }
                    })
                }
                this.allAutherizationRulesMap[rule.name] = insideRulMap;
            });
        }
        allAutherizationRulesMap = this.allAutherizationRulesMap;


        this.initializeSocketServer(server);
    }


    private getProcessService(): any {

        if (this.workerProcessService) {
            return this.workerProcessService;
        }
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var processService: any = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == "workerprocessservice").select(x => x.metadata[0]).firstOrDefault();
        if (processService) {
            this.workerProcessService = processService;
        }
        return this.workerProcessService;;
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
        var service: any = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == "authorizationService").select(x => x.metadata[0]).firstOrDefault();
        if (service) {
            return service.target.getAllUsersForNotification(entity);
        }
    }

    private sendMessageOnRepo = (repo: any, message: any) => {
        try {
            if (repo && message) {
                repo.onMessage(message);
            }
        }
        catch (ex) { console.log("error in on message", message); }
    }

    private getRandomElementInArray = (collection: Array<any>): any => {
        let high = collection.length - 1;
        let low = 0;
        let randomNo = Math.floor(Math.random() * (high - low + 1) + low);
        return collection[randomNo];
    }

    private checkIfRepoForMessenger = (meta: MetaData): boolean =>
        meta && (meta.params.exportType == ExportTypes.ALL ||
            (this.io && (((meta.params.exportType & ExportTypes.WS) == ExportTypes.WS) || 
            ((meta.params.exportType & ExportTypes.WS_BROAD_CAST) == ExportTypes.WS_BROAD_CAST) ||
            ((meta.params.exportType & ExportTypes.PUB_SUB) == ExportTypes.PUB_SUB)))
        )


    private initializeSocketServer(server?: any) {
        let self = this;


        let messenger = self.messenger;
        let io = self.io;
        if (server) {
            self.io = require('socket.io')(server, { 'transports': ['websocket', 'polling'] });
            io = self.io;
        }

        this.socketClientholder.socket = io;
        this.socketClientholder.messenger = messenger;

        let socketConector = () => {
            io.on('connection',
                function (socket) {
                    // this.socketClientholder.clients.push(client);



                    console.log('client connected', socket.id);


                    if (socket.handshake.query) {
                        securityImpl.getSession(socket.handshake.query).then((session: Session) => {



                            socket.handshake.query.curSession = session;
                            self.sessionSocketIdMap[session.userId] = socket.id;
                            if (socket.handshake.query && socket.handshake.query.applicableChannels
                                && socket.handshake.query.applicableChannels.length) {
                                socket.handshake.query.applicableChannels.forEach((room) => {
                                    if (room && room.name) {
                                        console.log("joined room", room.name);
                                        socket.join(room.name);
                                        if (!self.socketChannelGroups[room.name]) { self.socketChannelGroups[room.name] = {} }
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

                            if (socket.handshake.query && socket.handshake.query.reliableChannles) {
                                let channelArr: Array<string> = socket.handshake.query.reliableChannles.split(",");
                                if (channelArr && channelArr.length) {
                                    let newWorker: IWorkerProcess = {
                                        serverId: self.serverId, workerId: socket.id,
                                        status: "connected", channels: channelArr, sessionId: session.sessionId, role: session.role
                                    };
                                    self.getProcessService().target.createWorker(newWorker);
                                }
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
                                if (lastemit && self.channleMessangerMap && self.channleMessangerMap[rechannel]) {
                                    //for each chnnel ask messeger the send an array of pending message

                                    self.channleMessangerMap[rechannel].sendPendingMessage(rechannel, lastemit, socket.id);

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
                        if (socket.handshake.query && socket.handshake.query.reliableChannles) {
                            let channelArr: Array<string> = socket.handshake.query.reliableChannles.split(",");
                            if (channelArr && channelArr.length) {
                                let newWorker: IWorkerProcess = { serverId: self.serverId, workerId: socket.id, status: "disconnected", channels: channelArr };
                                self.getProcessService().target.updateWorker(newWorker);
                            }
                        }
                        if (socket.handshake.query.curSession) {
                            delete self.sessionSocketIdMap[socket.handshake.query.curSession.userId];
                        }
                    });

                    for (let key in repoMap) {
                        let repo = repoMap[key].repo;
                        let meta: MetaData = repo.getMetaData();
                        if (meta && ((meta.params.exportType & ExportTypes.WS) == ExportTypes.WS)) {
                            socket.on(key, function (data) {
                                var d = domain.create();
                                d.run(() => {
                                    try {
                                        let parsedData = data;

                                        let executefun = () => {
                                            try {
                                                if (parsedData && parsedData.action && parsedData.message) {
                                                    if (securityImpl.isAuthorize(parsedData, repo, parsedData.action)) {
                                                        repo[parsedData.action](parsedData.message)
                                                    }
                                                }
                                            } catch (exceptio) {
                                                console.log(exceptio);
                                            }
                                        };

                                        if (socket.handshake.query && socket.handshake.query.curSession) {
                                            PrincipalContext.User = securityImpl.getContextObjectFromSession(socket.handshake.query.curSession);
                                            executefun();
                                            return
                                        }

                                        (<any>(securityImpl.ensureLoggedIn()(parsedData, undefined, executefun))).catch((err) => { console.log(err); });

                                    }
                                    catch (exc) {
                                        console.log(exc);
                                    }
                                });
                            });
                        }

                    }
                }
            )
        }
        let messengerPool: Array<Messenger> = new Array<Messenger>();

        messengerPool.push(messenger);


        for (let key in repoMap) {
            let repo = repoMap[key].repo;
            let meta: MetaData = repo.getMetaData();
            if (self.checkIfRepoForMessenger(meta)) {
                let messenger = self.messenger;
                if (meta.params.dedicatedMessenger) {
                    messenger = new Messenger({ retryInterval: 3000, collectionName: key + "_message" });
                    messengerPool.push(messenger);
                }
                self.channleMessangerMap[key] = messenger;
                repo.setMessanger(messenger);
                messenger.subscribe(key, true);
                if (self.allSingleEmitterSettings[key] && self.allSingleEmitterSettings[key].length) {
                    console.log("over riding chekAndSend for ", key);
                   
                    messenger.chekAndSend = (path: string, message: any): Promise<any> => {
                        return new Promise((resolve, reject) => {
                            //message modification can be done here
                            //example check connected workers as receipents and setting for single worker is set
                            //get role which need to recive single worker
                            let rolesForSinlgeEmitter: Array<string> = self.allSingleEmitterSettings[path];

                            if (rolesForSinlgeEmitter && rolesForSinlgeEmitter.length) {
                                //get random worker
                                let singleWorkerOnRole: any = undefined;
                                let singleRandomWorker: Array<{ role: string, serverId: any, workerId: any }> =
                                    new Array<{ role: string, serverId: any, workerId: any }>();
                                rolesForSinlgeEmitter.forEach((role1) => {
                                    let singelWorker: IWorkerProcess = self.getProcessService().target.getSingleRandomWoker(path, role1);
                                    if (singelWorker) {
                                        singleRandomWorker.push({ role: role1, serverId: singelWorker.serverId, workerId: singelWorker.workerId });
                                    }
                                })
                                if (singleRandomWorker.length) {
                                    singleWorkerOnRole = {};
                                    singleRandomWorker.forEach((singleWorker) => {
                                        singleWorkerOnRole[singleWorker.role+"_RC"] = singleWorker; //assuming RC channel
                                    });
                                    message.singleWorkerOnRole = singleWorkerOnRole;
                                }
                            }
                        
                        messenger.send(path, message, function (err, data) {
                                resolve(true);
                                console.log('Sent message');
                            });
                    })
                }
                }
            }
        }


        messengerPool.forEach((messenger) => {
        // connect() begins "tailing" the collection 
            messenger.onConnect(function () {
            // emits events for each new message on the channel 

            console.log("messenger connected  starting registering repositories");

            for (let key in repoMap) {
                let repo = repoMap[key].repo;
                let meta: MetaData = repo.getMetaData();

                if (repo.getMessanger() != messenger) {
                    continue;
                }

                if (self.checkIfRepoForMessenger(meta)) {
                    messenger.on(key, function (message) {

                        console.log("message received on ", key);

                        if ((meta.params.exportType & ExportTypes.PUB_SUB) == ExportTypes.PUB_SUB) {
                            self.sendMessageOnRepo(repo, message);
                        }

                        if (!io) {
                            return;
                        }
                        //handle if repo is completly broadcast
                        let broadcastToAll = (castType: string) => {
                            let channelRoom = io.sockets.adapter.rooms[key];
                            if (channelRoom) {
                                var roomclients = channelRoom.length;

                                //io.sockets.emit(key, message);
                                io.to(key).emit(key, message);
                                //io.broadcast.to(key).emit(key, message);

                                console.log("WS_BROAD_CAST", { "channel": key, "no_of_broadcasts": roomclients });
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
                            if (!client) { return; }
                            if (!client.handshake) { return; }
                            if (!client.handshake.query) { return; }
                            if (!client.handshake.query.curSession) { return; }
                            reliableClients++;
                            let query = client.handshake.query;
                            let curSession = client.handshake.query.curSession;
                            console.log("updating session timstamp for ", query && query.name);
                            securityImpl.updateSession({
                                netsessionid: query.netsessionid,
                                channelName: key,
                                lastemit: messenger.lastMessageTimestamp,
                                status: 'active'
                            }, curSession);
                        }

                        for (let channleGroup in self.socketChannelGroups[key]) {
                            let isRealiableChannel = false;
                            let groupName = key + "_" + channleGroup; //channleGroup is {role} , {role_RC} , key is repo name matchedorder_ROLE_ADMIN
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


                            let addAllclientsInRoom = () => {
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

                            }

                            if (isRealiableChannel &&
                                message.singleWorkerOnRole && message.singleWorkerOnRole[channleGroup] &&
                                message.singleWorkerOnRole[channleGroup].serverId == self.serverId &&
                                roomclients[message.singleWorkerOnRole[channleGroup].workerId]) {
                               
                               
                                let client = io.sockets.connected[message.singleWorkerOnRole[channleGroup].workerId];
                                if (!client) {
                                    continue;
                                }

                                console.log("single emitter recieved on broadcasting", client.id)
                                broadcastClients.push(client);
                                broadCastClients++
                                connectedClients++;
                                updateReliableChannelSettings(client);
                            }
                            else {
                                addAllclientsInRoom();
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

            if (!io) {
                return;
            }
            if (messenger == self.messenger) {
                socketConector();
            }
        });
         })

        repositoryMap(repoMap);
    }
}
