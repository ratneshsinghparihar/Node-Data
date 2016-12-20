import {WorkerAssociation} from './interfaces/workerAssociation-params';
import {MetaUtils } from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
var child_process = require('child_process');
import * as Enumerable from 'linq';
import {winstonLog} from '../../logging/winstonLog';
import {WorkerParams} from './interfaces/worker-params';
import {workerParamsDto} from "./interfaces/workerParamsDto";
var fs = require('fs');

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
            winstonLog.logInfo("Input params for worker:  " + JSON.stringify(params.workerParams));

            descriptor.value =preProcessHandler(params, target, propertyKey, descriptor, originalMethod, 
            Decorators.WORKER);
    }


function preProcessHandler(params, target, propertyKey, descriptor, originalMethod, type: string) {
     return function () {  
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
                workerParams.workerName = "worker.js"; //default service to be executed.
                winstonLog.logInfo("Calling Default worker:  " + workerParams.workerName);

                serviceName = this.__proto__.constructor.name;
                workerParams.serviceName = serviceName;

                servicemethodName =propertyKey;
                workerParams.servicemethodName = servicemethodName;

                paramsArguments = params;
                workerParams.arguments = paramsArguments;
            }
            else {
                if(params.workerParams.serviceName != null)
                serviceName = params.workerParams.serviceName;

                if(params.workerParams.servicemethodName != null){
                servicemethodName = params.workerParams.servicemethodName;
                }

                if(params.workerParams.arguments){
                    paramsArguments = params.workerParams.arguments;
                }
            }
            
                winstonLog.logInfo("ServiceName: "+ serviceName + " servicemethodName: " + servicemethodName
                + " paramsArguments: "+ paramsArguments);
            
                if(workerParams.serviceName != null){
                    var worker_process = child_process.fork(workerParams.workerName);
                    if(worker_process.error==null){
                     worker_process.send({ worker_params: workerParams, message: "new child process created with id: " + worker_process.pid, params: workerParams});
                    
                     worker_process.on('message', function (message) {
                     winstonLog.logInfo('message from Child: ' + message);	
                    });
                    
                     worker_process.on('error', function (err) {
                     winstonLog.logError('Error : ' + err);
                    });

                     worker_process.on('close', function (code,signal) {
                     winstonLog.logStream('child process exited with code: ',code + ' signal: ' +signal);	
                  });
                }else{
                    winstonLog.logError("Error during creating child Process: "+worker_process.error);
                }
              }
        return descriptor;
          };
    }       
}