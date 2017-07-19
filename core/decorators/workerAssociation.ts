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
var uuid = require('uuid');

var workerProcess: Array<WorkerProcess> = new Array<WorkerProcess>();
var tasks: Array<workerParamsDto> = new Array<workerParamsDto>();

//update from configuration
var _appRoot = process.cwd();
var _defaultWorker = 'worker.js';
var _defaultNumnberOfWorker = 1;

class WorkerProcess {
    name: string;
    processId: number;
    executing: workerParamsDto;
    initialized: boolean;
    fork: any;
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

        descriptor.value = executeWorkerHandler(params, target, propertyKey, originalMethod,
            Decorators.WORKER);
    }
}

// Add debug options
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
        winstonLog.logInfo('success message from Child Process: ' + JSON.stringify(received));
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
    var proc: WorkerProcess;
    var workerName = configUtil.config().Config.worker ? (_appRoot + '/' + configUtil.config().Config.worker) : (_appRoot + '/' + _defaultWorker);
    var thread: number = configUtil.config().Config.process ? configUtil.config().Config.process : _defaultNumnberOfWorker;
    if (thread > 0) {
        tasks.push(param);
        if (workerProcess.length < thread) {
            // create new process entry and spawn it
            proc = new WorkerProcess();
            proc.name = 'worker' + workerProcess.length + 1;
            var path = workerName;
            if (configUtil.config().Config.worker) {
                path = _appRoot + '/' + configUtil.config().Config.worker;
            }
            winstonLog.logInfo("Forking a new child_process: " + path);
            proc.fork = child_process.fork(path, [], getDebugOption(workerProcess.length));
            if (proc.fork.error == null) {
                proc.processId = proc.fork.pid;
                proc.executing = <workerParamsDto>({ initialize: true, processId: proc.processId });
                winstonLog.logInfo('Child process created with id: ' + proc.fork.pid);

                proc.fork.on('message', function (message: any) {
                    // notify service attached with this process
                    try {
                        var par: workerParamsDto = <workerParamsDto>(message);
                        console.log('received message parsed successful');
                        var proc = Enumerable.from(workerProcess).firstOrDefault(x => x.processId == par.processId);
                        if (proc) {
                            sendNextMessage(proc, par);
                        }
                    }
                    catch (exc) {
                        winstonLog.logInfo('failed message from Child Process:' + message);
                    }
                });

                proc.fork.on('error', function (err) {
                    winstonLog.logError('Error : ' + err);
                    // notify service attached with this process
                });

                proc.fork.on('close', function (code, signal) {
                    winstonLog.logInfo('Child process exited with code: ' + code + ' signal: ' + signal);
                    // notify service attached with this process
                });
                workerProcess.push(proc);
                winstonLog.logInfo('sending worker:' + proc.executing);
                proc.fork.send(proc.executing);
            }
            else {
                winstonLog.logError("Error during creating child Process: " + proc.fork.error);
            }
        }
        else {
            proc = Enumerable.from(workerProcess).firstOrDefault(x => !x.executing);
            if (proc) {
                sendNextMessage(proc, null);
            }
        }
    }
    else {
        // always create new process and terminate on execution
    }
    return process;
}

export function executeWorkerHandler(params, target, propertyKey, originalMethod, type: string) {
    return function () {
        if (MetaUtils.childProcessId || !configUtil.config().Config.isMultiThreaded) {
            winstonLog.logInfo("Executing method from child Process with id: " + process.pid);
            return originalMethod.apply(this, arguments);
        }

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
            var decorators = MetaUtils.getMetaData(target);
            var dec = Enumerable.from(decorators).where(x => x.decorator == Decorators.SERVICE).firstOrDefault();
            if (dec) {
                workerParams.serviceName = dec.params.serviceName;
            }

            servicemethodName = propertyKey;
            workerParams.servicemethodName = servicemethodName;

            paramsArguments = arguments;
            workerParams.arguments = paramsArguments;
        }
        else {
            if (params.workerParams.serviceName != null && params.workerParams.serviceName != '') {
                serviceName = params.workerParams.serviceName;
                workerParams.serviceName = serviceName;
            } else {
                var decorators = MetaUtils.getMetaData(target);
                var dec = Enumerable.from(decorators).where(x => x.decorator == Decorators.SERVICE).firstOrDefault();
                if (dec) {
                    workerParams.serviceName = dec.params.serviceName;
                }
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
            workerParams.id = uuid.v4();
            var proc = executeNextProcess(workerParams);
            winstonLog.logDebug("Context at Worker: " + JSON.stringify(workerParams.principalContext));
            winstonLog.logInfo("PrincipalConext at Parent: " + JSON.stringify(PrincipalContext.getSession()));
        }
        return workerParams;
    };
}