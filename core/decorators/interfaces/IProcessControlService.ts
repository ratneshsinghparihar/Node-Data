import {workerParamsDto} from './workerParamsDto';
import {ProcessControlModel} from '../../../tests/models/processControlModel';

export interface IProcessControlService {
    initialize(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, args?: any, taskInfo?: workerParamsDto): Q.Promise<boolean>;
    startProcess(): Q.Promise<boolean>;
    completeProcess(responseData: any): Q.Promise<boolean>;
    errorOutProcess(errorMessage: string): Q.Promise<boolean>;
    sendResponse(processModel: any, workerDetails: workerParamsDto): Q.IPromise<any>;
}

export const processControlServiceName = 'ProcessControlService';

/**
 * get or set processControlContext through PrincipalContext
 * Use to store processControlModel in PrincipalContext to access in main application as well as in worker process
 */
export const processControlContext = "processControlContext";
