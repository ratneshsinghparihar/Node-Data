import {WorkerAssociation} from './interfaces/workerAssociation-params';
import {MetaUtils } from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
var child_process = require('child_process');
import * as Enumerable from 'linq';
import {winstonLog} from '../../logging/winstonLog';
import {WorkerParams} from './interfaces/worker-params';
import {workerParamsDto} from "./interfaces/workerParamsDto";
import * as configUtil from '../utils';
import {PrincipalContext} from '../../security/auth/principalContext';
var fs = require('fs');
var defaultWorkerName = "core/decorators/worker.js";
var cls = require('continuation-local-storage');

var thread: number = 2;
var workerProcess: Array<WorkerProcess> = new Array<WorkerProcess>();
var tasks: Array<workerParamsDto> = new Array<workerParamsDto>();
var workerName = 'worker.js';

class WorkerProcess {
    name: string;
    processId: number;
    executing: workerParamsDto;
    initialized: boolean;
    fork: any;
}

function getDebugOption(offset: number) {
    var execArgv = (<any>process).execArgv.slice(); //create args shallow copy
    var debugPort = (<any>process).debugPort + offset + 1;

    for (var i = 0; i < execArgv.length; i++) {
        var match = execArgv[i].match(/^(--debug|--debug-brk)(=\d+)?$/);
        if (match) {
            execArgv[i] = match[1] + '=' + debugPort;
            break;
        }
    }

    //var options = { env: process.env,  silent:false, execArgv: execArgv, cwd: targetProcessCwd };
    var options = { env: process.env, silent: false, execArgv: execArgv };
    return options;
}

function sendNextMessage(process: WorkerProcess, received: workerParamsDto) {
    if (received) {
        winstonLog.logInfo('message from Child Process: ' + JSON.stringify(received));
    }
    process.initialized = true;
    process.executing = null;
    if (tasks.length > 0) {
        var par = tasks.shift();
        par.processId = process.processId;
        process.executing = par;
        process.fork.send(par);
    }
}

function executeNextProcess(param: workerParamsDto) {
    var process: WorkerProcess;
    if (thread > 0) {
        tasks.push(param);
        if (workerProcess.length < thread) {
            // create new process entry and spawn it
            process = new WorkerProcess();
            process.name = 'worker' + workerProcess.length + 1;
            process.fork = child_process.fork(workerName, [], getDebugOption(workerProcess.length));
            if (process.fork.error == null) {
                process.processId = process.fork.pid;
                process.executing = <workerParamsDto>({ initialize: true, processId: process.processId });
                winstonLog.logInfo('Child process created with id: ' + process.fork.pid);

                process.fork.on('message', function (message) {
                    // notify service attached with this process
                    try {
                        var par: workerParamsDto = <workerParamsDto>(JSON.parse(message));
                        var proc = Enumerable.from(workerProcess).firstOrDefault(x => x.processId == par.processId);
                        if (proc) {
                            sendNextMessage(proc, par);
                        }
                    }
                    catch (exc) {
                        winstonLog.logInfo('message from Child Process:' + message);
                    }
                });

                process.fork.on('error', function (err) {
                    winstonLog.logError('Error : ' + err);
                    // notify service attached with this process
                });

                process.fork.on('close', function (code, signal) {
                    winstonLog.logInfo('Child process exited with code: ' + code + ' signal: ' + signal);
                    // notify service attached with this process
                });
                workerProcess.push(process);
                process.fork.send(process.executing);
            }
            else {
                winstonLog.logError("Error during creating child Process: " + process.fork.error);
            }
        }
        else {
            process = Enumerable.from(workerProcess).firstOrDefault(x => !x.executing);
            if (process) {
                sendNextMessage(process, null);
            }
        }
    }
    else {
        // always create new process and terminate on execution
    }
    return process;
}

export function Worker(params?: WorkerAssociation): any {
    params = params || <any>{};
    var session = PrincipalContext.getSession();

    return function (target: any, propertyKey: string, descriptor: any) {
        winstonLog.logDebug("target is: " + JSON.stringify(target) + " propertyKey " + JSON.stringify(propertyKey) + " descriptor is:  " + JSON.stringify(descriptor));
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.WORKER,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });
        var originalMethod = descriptor.value;
        winstonLog.logDebug("Input params for worker:  " + JSON.stringify(params.workerParams));

        descriptor.value = preProcessHandler(params, target, propertyKey, descriptor, originalMethod,
            Decorators.WORKER);
    }

    function preProcessHandler(params, target, propertyKey, descriptor, originalMethod, type: string) {
        return function () {
            if (MetaUtils.childProcessId || !configUtil.config().Config.isMultiThreaded) {
                winstonLog.logInfo("Executing method from child Process with id: " + process.pid);
                return originalMethod.apply(this, arguments);
            }

            var meta = MetaUtils.getMetaData(target, type, propertyKey);
            var targetObjectId: any;
            if (params.indexofArgumentForTargetObjectId)
                targetObjectId = arguments[params.indexofArgumentForTargetObjectId];

            if (params.indexofArgumentForTargetObject)
                targetObjectId = arguments[params.indexofArgumentForTargetObject]._id;

            var serviceName, servicemethodName, paramsArguments;
            var name = params.name;
            var workerParams = new workerParamsDto();

            if (params.workerParams == null) {
                winstonLog.logInfo("No Params sent with Worker()");
                workerParams.workerName = defaultWorkerName; //default service to be executed.
                winstonLog.logInfo("Calling Default worker:  " + workerParams.workerName);

                serviceName = this.__proto__.constructor.name;
                workerParams.serviceName = serviceName;

                servicemethodName = propertyKey;
                workerParams.servicemethodName = servicemethodName;

                paramsArguments = arguments;
                workerParams.arguments = paramsArguments;
            }
            else {
                if (!params.workerParams.workerName) {
                    workerParams.workerName = defaultWorkerName;
                    winstonLog.logInfo("Calling Default worker:  " + workerParams.workerName);
                }
                else {
                    workerParams.workerName = params.workerParams.workerName;
                    winstonLog.logInfo("Calling worker:  " + workerParams.workerName);
                }

                if (params.workerParams.serviceName != null && params.workerParams.serviceName != '') {
                    serviceName = params.workerParams.serviceName;
                    workerParams.serviceName = serviceName;
                } else {
                    serviceName = this.__proto__.constructor.name;
                    workerParams.serviceName = serviceName;
                }

                if (params.workerParams.servicemethodName != null && params.workerParams.servicemethodName != '') {
                    servicemethodName = params.workerParams.servicemethodName;
                    workerParams.servicemethodName = servicemethodName;
                }
                else {
                    servicemethodName = propertyKey;
                    workerParams.servicemethodName = servicemethodName;
                }

                if (params.workerParams.arguments != null && params.workerParams.arguments != '') {
                    paramsArguments = params.workerParams.arguments;
                    workerParams.arguments = paramsArguments;
                } else {
                    paramsArguments = arguments;
                    workerParams.arguments = paramsArguments;
                }

            }

            workerParams.arguments = Array.prototype.slice.call(workerParams.arguments);
            workerParams.arguments = <any>workerParams.arguments.slice(0, originalMethod.length);
            winstonLog.logInfo("Worker Params: " + JSON.stringify(workerParams));

            PrincipalContext.save('workerParams', JSON.stringify(workerParams));
            workerParams.principalContext = PrincipalContext.getAllKeyValues();
            if (workerParams.principalContext['req']) {
                delete workerParams.principalContext['req'];
            }
            if (workerParams.principalContext['res']) {
                delete workerParams.principalContext['res'];
            }

            if (workerParams.serviceName != null) {
                console.log("Forking a new child_process: " + workerParams.workerName);
                var proc = executeNextProcess(workerParams);
                winstonLog.logDebug("Context at Worker: " + JSON.stringify(workerParams.principalContext));
                winstonLog.logInfo("PrincipalConext at Parent: " + JSON.stringify(PrincipalContext.getSession()));
            }
            return null;
        };
    }

}