import { service, inject } from '../../di/decorators';
import {processControlServiceName, IProcessControlService, processControlContext} from '../../core/decorators/interfaces/IProcessControlService';
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

    public initialize(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, args?: any): Q.Promise<boolean> {
        let newProcessControlObj: ProcessControlModel = this.constructNewProcessControlModel(serviceName, methodName, targetObjectId, type, action, args);
        console.log('processId:' + process.pid);
        return this.CanStartProcess(newProcessControlObj).then((sucess) => {
            if (sucess) {
                return this.processControlRepository.post(newProcessControlObj).then(
                    (processObjCreated) => {
                        try {
                            PrincipalContext.save(processControlContext, processObjCreated);
                            return processObjCreated;
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

    public startProcess(): Q.Promise<boolean> {
        return this.checkRunningAndChangeStatus(processStatus.RUNNING);
    }

    public completeProcess(responseData: any): Q.Promise<boolean> {
        return this.checkRunningAndChangeStatus(processStatus.COMPLETED, responseData);
    }

    public errorOutProcess(errorMessage: string): Q.Promise<boolean> {
        return this.checkRunningAndChangeStatus(processStatus.ERROR, errorMessage);
    }

    private checkRunningAndChangeStatus(newStatus: string, responseData?:any): Q.Promise<boolean> {
        let processControlObj: ProcessControlModel = PrincipalContext.get(processControlContext);
        processControlObj.status = newStatus;
        if (responseData) {
            processControlObj.responseData = responseData;
        }

        return this.processControlRepository.patch(processControlObj._id, processControlObj).then(
            (sucess) => {
                console.log("Successfully marked complete in checkRunningAndChangeStatus  processEntityId: " + processControlObj._id);
                return sucess;
            },
            (error) => {
                console.log("Error occured in checkRunningAndChangeStatus while patching status processEntityId: " + processControlObj._id);
                return true;
            });
    }

    private CanStartProcess(processControlModel: ProcessControlModel): Q.Promise<boolean> {
        return Q.when(true);
    }

    private constructNewProcessControlModel(serviceName: string, methodName: string, targetObjectId: any, type: string, action: string, args?: any) {
        var newProcessControlObj = new ProcessControlModel();
        newProcessControlObj.processEntityType = type;
        newProcessControlObj.processEntityId = targetObjectId;
        newProcessControlObj.processEntityAction = action;
        newProcessControlObj.status = processStatus.NOT_STARTED;
        newProcessControlObj.processId = process.pid;
        newProcessControlObj.serviceName = serviceName;
        newProcessControlObj.serviceMethodName = methodName;
        newProcessControlObj.serviceMethodArgs = args;
        return newProcessControlObj;
    }

    public sendResponse(processModel: ProcessControlModel, workerDetails: workerParamsDto): Q.IPromise<any> {
        let trackObj: TrackWorkerTask = {
            trackUrl: "processControl/" + processModel._id,
            tractData: processModel,
            message: "Action will be executed in worker thread, please hit the trackUrl to find the tast status"
        };

        return Q.when(trackObj);
    }
}

export interface TrackWorkerTask {
    trackUrl: string;
    tractData: ProcessControlModel
    message: string;
}

export default ProcessControlService;