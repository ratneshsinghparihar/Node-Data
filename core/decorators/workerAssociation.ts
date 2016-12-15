import {WorkerAssociation} from './interfaces/workerAssociation-params';
import {MetaUtils } from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
var child_process = require('child_process');
import * as Enumerable from 'linq';
var fs = require('fs');


export function Worker(params: WorkerAssociation): any {
params = params || <any>{};

 return function (target: String, propertyKey: string, descriptor: any) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.WORKER,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });
            var originalMethod = descriptor.value;
            descriptor.value = function () {
                console.log("Worker thread created...");
                var name=params.name;
                var workerParams=params.workerParams;
                if(workerParams==null || workerParams.actionName == null ){
                    workerParams.actionName ="support.ts"; //default service to be executed.
                }
                if(workerParams.actionmethodName != null){
                    var worker_process = child_process.fork(workerParams.actionName);
                    if(worker_process.error==null){

                    var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
                    console.log("services _length : "+ services.length + "services are: "+ services.toString);  

                    var instanceService=Enumerable.from(services).where(x => x.metadata[0].params.serviceName == "UserDetailService").select(x => x.metadata[0]).firstOrDefault();
                    console.log("instanceService : "+ instanceService); 
                    
                    //worker_process.send('new child process created with id: '+ worker_process.pid);
                    worker_process.send({service:services,message: "'new child process created with id: "+ worker_process.pid});
                    
                    worker_process.on('message', function (message) {
                    console.log('message from Child: ' + message);	
                    });
                    
                    worker_process.on('close', function (code,signal) {
                    console.log('child process exited with code ',code, signal);	
                  });
                }else{
                    console.log("Error while creating child Process: "+worker_process.error);
                }
              }
            }
            return descriptor;
    }
}