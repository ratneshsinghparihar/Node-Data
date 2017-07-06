import {workerParamsDto} from './workerParamsDto';

export interface IProcessControlService {
    initialize(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, args?: any, taskInfo?: workerParamsDto): Q.Promise<boolean>;
    startProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string): Q.Promise<boolean>;
    completeProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string): Q.Promise<boolean>;
    errorOutProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string, errorMessage: string): Q.Promise<boolean>;
    sendResponse(processModel: any, workerDetails: workerParamsDto): Q.IPromise<any>;
}

export const processControlServiceName = 'ProcessControlService';
