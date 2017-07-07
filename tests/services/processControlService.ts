import { service, inject } from '../../di/decorators';
import {processControlServiceName, IProcessControlService} from '../../core/decorators/interfaces/IProcessControlService';
import {workerParamsDto} from "../../core/decorators/interfaces/workerParamsDto";
import {ProcessControlModel} from '../models/processControlModel';
import * as prcessControlRepo from '../repositories/processControlRepository';
import { PrincipalContext } from '../../security/auth/principalContext';
import Q = require('q');

console.log('initializing ProcessControlService');

const processStatus = {
    "NOT_STARTED": "NOT_STARTED",
    "COMPLETED": "COMPLETED",
    "RUNNING": "RUNNING",
    "ERROR": "ERROR"
}

@service({ singleton: true, serviceName: processControlServiceName })
export class ProcessControlService implements IProcessControlService {

    @inject(prcessControlRepo)
    private processControlRepository: prcessControlRepo.ProcessControlrepository;

    public initialize(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, args?: any, taskInfo?: workerParamsDto): Q.Promise<boolean> {
        var newProcessControlObj = new ProcessControlModel();
        newProcessControlObj.processEntityType = type;
        newProcessControlObj.processEntityId = targetObjectId;
        newProcessControlObj.processEntityAction = action;
        newProcessControlObj.status = processStatus.NOT_STARTED;
        console.log('taskInfo:' + taskInfo + ' processId:' + process.pid);
        if (taskInfo && taskInfo.serviceName == serviceName && taskInfo.servicemethodName == methodName) {
            newProcessControlObj.workerDetails = taskInfo;
            newProcessControlObj.workerId = taskInfo.id;
        }
        if (args) {
            newProcessControlObj.args = args;
        }
        return this.CanStartProcess(newProcessControlObj).then((sucess) => {
            if (sucess) {
                return this.processControlRepository.post(newProcessControlObj).then(
                    (processObjCreated) => {
                        try {
                            PrincipalContext.save("processControlContext", processObjCreated);
                            return true;
                        } catch (error) {
                            return true;
                        }
                    },
                    (error) => {
                        console.log("Error in creating new  process control : " + error);
                        return false;
                    });
            } else {
                return false;
            }
        }, (error) => {
            return false;
        });
    }

    public startProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string): Q.Promise<boolean> {
        return this.checkRunningAndChangeStatus(serviceName, methodName, targetObject, type, action, processStatus.RUNNING);
    }

    public completeProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string): Q.Promise<boolean> {
        return this.checkRunningAndChangeStatus(serviceName, methodName, targetObject, type, action, processStatus.COMPLETED);
    }

    public errorOutProcess(serviceName: string, methodName: string, targetObject: any, type: string, action: string, errorMessage: string): Q.Promise<boolean> {
        return this.checkRunningAndChangeStatus(serviceName, methodName, targetObject, type, action, processStatus.ERROR, errorMessage);
    }

    private checkRunningAndChangeStatus(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, newStatus: string, error?: string): Q.Promise<boolean> {
        let query = {
            "processEntityId": targetObjectId,
            "processEntityAction": action,
            "processEntityType": type
        }
        var workerParams: workerParamsDto = PrincipalContext.get('workerParams');
        if (workerParams && workerParams.serviceName == serviceName && workerParams.servicemethodName == methodName) {
            query['workerId'] = workerParams.id;
        }
        return this.processControlRepository.findWhere(query).then((result: Array<ProcessControlModel>) => {
            if (result && result.length) {
                var currentProcessObj: ProcessControlModel = result[0];
                console.log("Found entry for process in checkRunningAndChangeStatus  processEntityId:" + targetObjectId + " processEntityAction " + action + "  query is " + query);
                currentProcessObj.status = newStatus;
                if (newStatus == processStatus.ERROR) {
                    currentProcessObj.erroMessage = error;
                }
                return this.processControlRepository.patch(currentProcessObj._id, currentProcessObj).then(
                    (sucess) => {
                        console.log("Successfully marked complete in checkRunningAndChangeStatus  processEntityId: " + targetObjectId + " processEntityAction " + action);
                        return sucess;
                    },
                    (error) => {
                        console.log("Error occured in checkRunningAndChangeStatus while patching status processEntityId: " + targetObjectId + " processEntityAction" + action);
                        return true;
                    });
            }
        }).catch(error => {
            console.log("Error in " + newStatus + " process control Error" + error);
            return false;
        });
    }

    private CanStartProcess(processControlModel: ProcessControlModel): Q.Promise<boolean> {
        return Q.when(true);
    }

    public sendResponse(processModel: any, workerDetails: workerParamsDto): Q.IPromise<any> {
        return Q.when('Action will be executed in worker thread');
    }
}

export default ProcessControlService;