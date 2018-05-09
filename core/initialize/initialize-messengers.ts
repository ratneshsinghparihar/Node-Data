
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
export var allAutherizationRules: Array<{
    name: string;
    acl: Array<IAutherizationParam>;
    isRepoAuthorize: boolean;
}> 

export var workerProcessService: IWorkerProcessService;
export var mainMessenger: Messenger;

import {messageBraodcastOnMessenger,socketConnector} from "./initialize-scokets"

export class InitializeMessengers {



    private _schemaGenerator: ISchemaGenerator;


    private messenger = new Messenger({ retryInterval: 3000 });

    private channleMessangerMap: any = {};

    private serverId = uuidv4();

    private workerProcessService: IWorkerProcessService;



    private allAutherizationRulesMap: any = {};

    // name.role :{ role: string, accessmask: number, acl?: boolean }
    private allSingleEmitterSettings: any = {}; // {repo.name} : Array<strings> roles
    constructor(server?: any) {
        this.messenger.sendMessageToclient = this.sendMessageToclient;
        this.messenger.getAllUsersForNotification = this.getAllUsersForNotification;
        this.getProcessService();
        allAutherizationRules = <Array<{
            name: string;
            acl: Array<IAutherizationParam>;
            isRepoAuthorize: boolean;
        }>>(configUtils.securityConfig().SecurityConfig.ResourceAccess);

        mainMessenger = this.messenger;

        if (allAutherizationRules && allAutherizationRules.length) {
            allAutherizationRules.forEach((rule) => {

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


        this.initializeMessengersOnRepo(server);
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

    private getProcessService(): any {

        if (workerProcessService) {
            return workerProcessService;
        }
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var processService: any = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == "workerprocessservice").select(x => x.metadata[0]).firstOrDefault();
        if (processService) {
            workerProcessService = processService.target;
        }
        return workerProcessService;
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



    private checkIfRepoForMessenger = (meta: MetaData): boolean =>
        meta && (meta.params.exportType == ExportTypes.ALL ||
            ((((meta.params.exportType & ExportTypes.WS) == ExportTypes.WS) ||
                ((meta.params.exportType & ExportTypes.WS_BROAD_CAST) == ExportTypes.WS_BROAD_CAST) ||
                ((meta.params.exportType & ExportTypes.PUB_SUB) == ExportTypes.PUB_SUB)))
        )


    private initializeMessengersOnRepo(server?: any) {
        let self = this;


        let messenger = self.messenger;

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
                                    let singelWorker: IWorkerProcess = self.getProcessService().getSingleRandomWoker(path, role1);
                                    if (singelWorker) {
                                        singleRandomWorker.push({ role: role1, serverId: singelWorker.serverId, workerId: singelWorker.workerId });
                                    }
                                })
                                if (singleRandomWorker.length) {
                                    singleWorkerOnRole = {};
                                    singleRandomWorker.forEach((singleWorker) => {
                                        singleWorkerOnRole[singleWorker.role + "_RC"] = singleWorker; //assuming RC channel
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


                self.channleMessangerMap[key] = messenger;
                repo.setMessanger(messenger);
                messenger.subscribe(key, true);

                messenger.sendMessageOnRepo = this.sendMessageOnRepo;
                
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

                            messageBraodcastOnMessenger(repo, message);

                        })
                    }
                }

                if (messenger == mainMessenger) {
                    socketConnector();
                }
                

            });
        })

        repositoryMap(repoMap);
    }
}
