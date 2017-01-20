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
import {PrincipalContext} from '../../security/auth/principalContext';
import * as Enumerable from 'linq';
import * as Utils from "../utils";
import {winstonLog} from '../../logging/winstonLog';
import {Container} from '../../di';
import {responseDetails} from './interfaces/response';
//var domain = require('../../security/auth/domain');
//var cls = require('continuation-local-storage');


var serverUp= function(){
    winstonLog.logInfo("+++++++++++++++++++ =======\n +++++++++++ Wroker executed +++++++++++ \n +++++++++++++++++++ =======");
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
  var response: responseDetails = new responseDetails();  
    try{  
    serverUp(); // Prepares the server.
        
PrincipalContext.getSession().run(function(){
    
    MetaUtils.childProcessId = process.pid;
    winstonLog.logInfo("Input from Parent Process : "+JSON.stringify(m));
 
  
    if( m.workerParams != null) {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        //console.log("Services: "+ JSON.stringify(services));
        var serviceName=m.workerParams.serviceName;
        var principalContext=m.workerParams.principalContext;
      
        //Setting up Principal context for the new process.
        for(var i in  principalContext){
            var key=i;
            var val= principalContext[i];
            PrincipalContext.save(key,val);
        }
        //winstonLog.logInfo("PrincipalContext at worker : "+ JSON.stringify(PrincipalContext.getSession()));  
        
        //winstonLog.logDebug(" All Available Services : "+ JSON.stringify(services) + " service: "+ service_name);
        var service=Enumerable.from(services).where(x => x.metadata[0].target.constructor.name == serviceName).select(x => x.metadata[0]).firstOrDefault();
        winstonLog.logInfo("Target Service with content : "+ JSON.stringify(service));
        if(service){
            var injectedProp = Container.resolve(service.params.target);
            winstonLog.logDebug('Service instance: '+injectedProp);
            var methodName=m.workerParams.servicemethodName;
            winstonLog.logDebug("Method Names: "+ JSON.stringify(methodName));
            var methodArguments=m.workerParams.arguments;
            winstonLog.logDebug("arugment Names: "+ methodArguments);
            var ret = injectedProp[methodName].apply(injectedProp,methodArguments);
            if (Utils.isPromise(ret)) {
                 ret.then(res=>{
                    console.log("Target Method executed");
                    response.message="Target Method executed";
                    response.status="success";
                   // process.send("Target Method executed and result is " + JSON.stringify(res),);
                     process.send(JSON.stringify(response));
                    process.exit();
                 });
                }else {
                //return Q.when(true);
                response.message="Method could not be executed";
                response.status="failure";
                response.error=JSON.stringify(ret);
                process.send(JSON.stringify(response));
                //process.send("Method could not be executed and error is " + JSON.stringify(ret));
                process.exit();
            }
        }
        else{
        response.message="No service found.";
        response.status="failure";
        process.send(JSON.stringify(response));
        //process.send("No service found.");
        process.exit();
        }
     }else{
         response.message="Worker param is null";
         response.status="failure";
         process.send(JSON.stringify(response));
         //process.send("Worker param is null. Exiting.... ");
         process.exit();
     }

})
    }catch(error){
         response.message="Error found:";
         response.status="failure";
         response.error=error;
         process.send(response);
        //winstonLog.logError("Error found: "+ error);
        process.exit();
    }
 });