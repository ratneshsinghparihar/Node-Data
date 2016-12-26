require("reflect-metadata/Reflect");
import * as express from "express";
import * as Config from "../../config";
import * as securityConfig from "../../security-config";
import {router} from "../exports";
import * as data from "../../mongoose";
import { Decorators } from '../constants/decorators';
import { DecoratorType } from '../enums/decorator-type';
import { MetaUtils } from "../metadata/utils";
import {MetaData, IMetaOptions} from "../metadata/metadata" ;
import {CurrentUserDetailService} from "../../current-user-detail-service";
import {UserDetailService} from "../../security/auth/user-detail-service";
import * as Enumerable from 'linq';
import * as Utils from "../utils";
import {winstonLog} from '../../logging/winstonLog';
import {Container} from '../../di';

var serverUp= function(){
    winstonLog.logInfo("+++++\n\n\n\++++++++++++++ ======= Executed +++\n\n\n\n\++++++++++++++++");
    const app = express();
    const Main = require("../../core");
    Config.Config.ignorePaths= Config.Config.ignorePaths || [];
    Config.Config.ignorePaths.push('**/server.js','**/worker.js')
    Main(Config, securityConfig, __dirname, data.entityServiceInst);
    const test = require('../../unit-test/services/blogServiceImpl'); // Test Service i.e. BlogService required for testing in Jasmine.
    data.connect();
    data.generateSchema();
    app.use("/", router);
    Main.register(app);
}
process.on('message', function (m) {
    try{
    serverUp(); // Prepares the server.
    MetaUtils.childProcessId = process.pid;
    winstonLog.logInfo("Input from Parent Process : "+JSON.stringify(m));
    var worker_params= JSON.stringify(m.worker_params);
    if( m.worker_params != null) {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var service_name=m.worker_params.serviceName;
        //winstonLog.logDebug(" All Available Services : "+ JSON.stringify(services) + " service: "+ service_name);
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
    }catch(error){
        winstonLog.logError("Error found: "+ error);
    }
 });