import {Worker} from '../../core/decorators/workerAssociation';
import {WorkerAssociation} from '../../core/decorators/interfaces/workerassociation-params';
import {WorkerParams} from '../../core/decorators/interfaces/worker-params';


export class ThreadControllerTest { 
  
    @Worker({name: 'workerThread', workerParams:{actionName: 'support.ts', actionmethodName:'execute()',arguments:['']}})
    public createworkedThread(): any{
        console.log("Calling worker thread..");
        return;
    }

}