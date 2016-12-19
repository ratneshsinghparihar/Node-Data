
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

// if (debug) {
//     process.argv.push('--debug=' + (40894));
// }

}

process.on('message', function (m) {
    serverUp(); // Prepares the server.
    var worker_params= JSON.stringify(m.worker_params);
    winstonLog.logInfo("Message from parent: " + m.message + " and worker_params: "+ worker_params);
     if( worker_params != null) {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        //winstonLog.logDebug("services length : "+ services.length+ " service names: "+ JSON.stringify(services));
        var service_name=m.worker_params.serviceName;
        var service=Enumerable.from(services).where(x => x.metadata[0].params.serviceName == service_name).select(x => x.metadata[0]).firstOrDefault();
        winstonLog.logInfo("Service: "+ service + " with input content : "+ JSON.stringify(service));
        if(service){
            var methodName=m.worker_params.servicemethodName;
            winstonLog.logDebug("Method Names: "+ JSON.stringify(methodName));
            var arugments =m.worker_params.arugments;
            winstonLog.logDebug("arugment Names: "+ JSON.stringify(arugments));

            var ret = service.target[methodName].apply(service.target, arugments);
             if (Utils.isPromise(ret)) {
                   process.send("Method executed and result is " + JSON.stringify(ret))
                }else {
                return Q.when(ret);
            }
        }
        else{
        process.send("No service found.");
        }
     }else{
         process.send("Worker param is null. Exiting.... ");
     }
 });
