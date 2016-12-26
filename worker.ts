require("reflect-metadata/Reflect");
import * as express from "express";
import * as Config from "./config";
import * as securityConfig from "./security-config";
import {router} from "./core/exports";
import * as data from "./mongoose";
import { Decorators } from './core/constants/decorators';
import { DecoratorType } from './core/enums/decorator-type';
import { MetaUtils } from "./core/metadata/utils";
import {MetaData, IMetaOptions} from "./core/metadata/metadata" ;
import {CurrentUserDetailService} from "./current-user-detail-service";
import {UserDetailService} from "./security/auth/user-detail-service";
import * as Enumerable from 'linq';
import * as Utils from "./core/utils";
import {winstonLog} from './logging/winstonLog';
import {Container} from './di';

var serverUp= function(){
    winstonLog.logInfo("+++++\n\n\n\++++++++++++++ ======= Executed +++\n\n\n\n\++++++++++++++++");
    const app = express();
    const Main = require("./core");
    Config.Config.ignorePaths= Config.Config.ignorePaths || [];
    Config.Config.ignorePaths.push('**/server.js','**/worker.js')
    Main(Config, securityConfig, __dirname, data.entityServiceInst);
    data.connect();
    data.generateSchema();
    app.use("/", router);
    Main.register(app);
}
//console.log("Executing Worker.Js with "+  process.pid);
process.on('message', function (m) {
    serverUp(); // Prepares the server.
    MetaUtils.childProcessId = process.pid;
    winstonLog.logInfo(" Input message details: "+JSON.stringify(m));
    var worker_params= JSON.stringify(m.worker_params);
    if( m.worker_params != null) {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var service_name=m.worker_params.serviceName;
        winstonLog.logDebug("Available Services with input content : "+ JSON.stringify(services) + " service: "+ service_name);
        //var service=Enumerable.from(services).where(x => x.metadata[0].params.serviceName == service_name).select(x => x.metadata[0]).firstOrDefault();
        var service=Enumerable.from(services).where(x => x.metadata[0].target.constructor.name == service_name).select(x => x.metadata[0]).firstOrDefault();
        winstonLog.logInfo("Required Service: "+ service + " with input content : "+ JSON.stringify(service));
        if(service){
            var injectedProp = Container.resolve(service.params.target);
            winstonLog.logDebug('Service instance: '+injectedProp);
            var methodName=m.worker_params.servicemethodName;
            winstonLog.logDebug("Method Names: "+ JSON.stringify(methodName));
            var methodArguments=m.worker_params.arguments;
            winstonLog.logDebug("arugment Names: "+ methodArguments);
            var ret = injectedProp[methodName].apply(injectedProp,methodArguments);
            if (Utils.isPromise(ret)) {
                 ret.then(res=>{
                    process.send("Target Method executed and result is " + JSON.stringify(res));
                    //process.exit();
                 });
                }else {
                //return Q.when(true);
                process.send("Method could not be executed and error is " + JSON.stringify(ret));
                //process.exit();
            }
        }
        else{
         process.send("No service found.");
        }
     }else{
         process.send("Worker param is null. Exiting.... ");
     }
 });