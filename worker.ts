require("reflect-metadata/Reflect");
import * as Config from "./config";
import * as securityConfig from "./security-config";
import * as data from "./mongoose";
import { Decorators } from './core/constants/decorators';
import { MetaUtils } from "./core/metadata/utils";
import {MetaData, IMetaOptions} from "./core/metadata/metadata";
import {PrincipalContext} from './security/auth/principalContext';
import * as Utils from "./core/utils";
import {winstonLog} from './logging/winstonLog';
import {Container} from './di';
import {responseDetails} from './core/decorators/interfaces/response';
import * as express from "express";
import * as Enumerable from 'linq';
import {workerParamsDto} from "./core/decorators/interfaces/workerParamsDto";
var Main = require("./core");
var domain = require('domain');
const test = require('./unit-test/services/blogServiceImpl'); // Test Service i.e. BlogService required for testing in Jasmine.

function intiliaze(params: workerParamsDto) {
    try {
        winstonLog.logInfo("+++++++++++++++++++ =======\n +++++++++++ Wroker executed +++++++++++ \n +++++++++++++++++++ =======");
        const app = express();
        Config.Config.ignorePaths = Config.Config.ignorePaths || [];
        Config.Config.ignorePaths.push('**/server.js', '**/worker.js')
        Main(Config, securityConfig, __dirname, data.entityServiceInst);
        data.connect();
        data.generateSchema();
        Main.register(app);
        params.status = Utils.ProcessStatus.success;
        params.message = "Initialized succesfully";
    }
    catch (exc) {
        params.status = Utils.ProcessStatus.failure;
        params.message = "Error found in initialization : " + exc;
    }
    winstonLog.logInfo(params.message);
    process.send(params);
}

function execute(params: workerParamsDto) {
    try {
        winstonLog.logInfo('executing child process');
        var d = domain.create();
        d.run(() => {
            MetaUtils.childProcessId = process.pid;

            var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
            var service = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == params.serviceName).select(x => x.metadata[0]).firstOrDefault();
            var serviceName = params.serviceName;

            //Setting up Principal context for the new process.
            var principalContext = params.principalContext;
            for (var i in principalContext) {
                var key = i;
                var val = principalContext[i];
                PrincipalContext.save(key, val);
            }
            PrincipalContext.save('workerParams', params);
            winstonLog.logInfo('done default properties of principal context');
            if (service) {
                var injectedProp = Container.resolve(service.params.target);
                winstonLog.logInfo('Service instance: ' + injectedProp);
                var methodName = params.servicemethodName;
                winstonLog.logInfo("Method Names: " + JSON.stringify(methodName));
                var methodArguments = params.arguments;
                winstonLog.logInfo("arugment Names: " + methodArguments);
                try {
                    var ret = injectedProp[methodName].apply(injectedProp, methodArguments);
                    if (Utils.isPromise(ret)) {
                        ret.then(res => {
                            params.message = "Target Method executed";
                            params.status = Utils.ProcessStatus.success;
                            sendMessage(params);
                        }).catch(exc => {
                            params.message = exc;
                            params.status = Utils.ProcessStatus.failure;
                            sendMessage(params);
                        });
                    } else {
                        params.message = "Target Method executed";
                        params.status = Utils.ProcessStatus.success;
                        sendMessage(params);
                    }
                }
                catch (exc) {
                    params.message = exc;
                    params.status = Utils.ProcessStatus.failure;
                    sendMessage(params);
                }
            }
            else {
                params.message = "No service found.";
                params.status = Utils.ProcessStatus.success;
                sendMessage(params);
            }
        });
    }
    catch (exc) {
        params.status = Utils.ProcessStatus.failure;
        params.message = exc;
        sendMessage(params);
    }
}

function sendMessage(params: workerParamsDto) {
    winstonLog.logInfo(params.message);
    process.send(params);
}

process.on('message', function (m) {
    console.log(m);
    var params = <workerParamsDto>m;
    if (params.initialize) {
        console.log('initializing');
        intiliaze(params);
    }
    else {
        console.log('executing');
        execute(params);
    }
});
