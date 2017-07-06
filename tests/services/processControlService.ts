import { service, inject } from '../../di/decorators';
import {processControlServiceName, IProcessControlService} from '../../core/decorators/interfaces/IProcessControlService';
import {workerParamsDto} from "../../core/decorators/interfaces/workerParamsDto";
import Q = require('q');

@service({ singleton: true, serviceName: processControlServiceName })
export class ProcessControlService implements IProcessControlService {

    public initialize(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, args?: any, taskInfo?: workerParamsDto): Q.Promise<boolean> {
        return Q.when(true);
    }

    public startProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string): Q.Promise<boolean> {
        return Q.when(true);
    }

    public completeProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string): Q.Promise<boolean> {
        return Q.when(true);
    }

    public errorOutProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string, errorMessage: string): Q.Promise<boolean> {
        return Q.when(true);
    }

    public sendResponse(processModel: any, workerDetails: workerParamsDto): Q.IPromise<any> {
        return Q.when('Action will be executed in worker thread');
    }
}

export default ProcessControlService;