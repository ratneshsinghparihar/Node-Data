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
var fs = require('fs');
var defaultWorkerName="core/decorators/worker.js";

export function Worker(params?: WorkerAssociation): any {
params = params || <any>{};

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

            descriptor.value =preProcessHandler(params, target, propertyKey, descriptor, originalMethod, 
            Decorators.WORKER);
    }

function preProcessHandler(params, target, propertyKey, descriptor, originalMethod, type: string) {
     return function () {
         if(MetaUtils.childProcessId || !configUtil.config().Config.isMultiThreaded){
            winstonLog.logInfo("Executing method from child Process with id: "+process.pid);
            return originalMethod.apply(this, arguments);
         }
        var meta = MetaUtils.getMetaData(target, type, propertyKey);
        var targetObjectId: any;
        if (params.indexofArgumentForTargetObjectId)
            targetObjectId = arguments[params.indexofArgumentForTargetObjectId];

        if (params.indexofArgumentForTargetObject)
            targetObjectId = arguments[params.indexofArgumentForTargetObject]._id;

                var serviceName,servicemethodName,paramsArguments;
                var name=params.name;
                var workerParams = new workerParamsDto();
            
            if (params.workerParams == null) {
                winstonLog.logInfo("Worker Params found empty.");
                workerParams.workerName = defaultWorkerName; //default service to be executed.
                winstonLog.logInfo("Calling Default worker:  " + workerParams.workerName);

                serviceName = this.__proto__.constructor.name;
                workerParams.serviceName = serviceName;

                servicemethodName =propertyKey;
                workerParams.servicemethodName = servicemethodName;

                paramsArguments = arguments;
                workerParams.arguments = paramsArguments;
            }
            else {
                if(params.workerParams.workerName==null || params.workerParams.workerName == ''){
                    workerParams.workerName = defaultWorkerName;
                    winstonLog.logInfo("Calling Default worker:  " + workerParams.workerName);
                }

                if(params.workerParams.serviceName != null && params.workerParams.serviceName != ''){
                    serviceName = params.workerParams.serviceName;
                    workerParams.serviceName = serviceName; 
                }else{
                    serviceName = this.__proto__.constructor.name;
                    workerParams.serviceName = serviceName;
                }

                if(params.workerParams.servicemethodName != null && params.workerParams.servicemethodName != ''){
                    servicemethodName = params.workerParams.servicemethodName;
                    workerParams.servicemethodName = servicemethodName;
                }
                else{
                    servicemethodName =propertyKey;
                    workerParams.servicemethodName = servicemethodName;
                }

                if(params.workerParams.arguments != null && params.workerParams.arguments != ''){
                    paramsArguments = params.workerParams.arguments;
                    workerParams.arguments = paramsArguments;
                }else{
                    paramsArguments = arguments;
                    workerParams.arguments = paramsArguments;
                }
            }
                workerParams.arguments = Array.prototype.slice.call(workerParams.arguments);
                winstonLog.logInfo("Worker Params Details: "+ JSON.stringify(workerParams)); 
                if(workerParams.serviceName != null){
                    console.log("forking a new child_process: "+ workerParams.workerName);
                    var worker_process = child_process.fork(workerParams.workerName);
                    if(worker_process.error==null){
                     winstonLog.logInfo('Child process created with id: '+ worker_process.pid);
                     
                     worker_process.on('message', function (message) {
                     winstonLog.logInfo('message from Child Process : ' + message);	
                    });
                    
                     worker_process.on('error', function (err) {
                     winstonLog.logError('Error : ' + err);
                    });

                     worker_process.on('close', function (code,signal) {
                     winstonLog.logInfo('Child process exited with code: '+code + ' signal: ' +signal);	
                  });
                 
                    worker_process.send({ worker_params: workerParams, message: "new child process created with id: " + worker_process.pid
                     }); 
                }else{
                    winstonLog.logError("Error during creating child Process: "+worker_process.error);
                }
              }
        return descriptor;
          };
    }       
}