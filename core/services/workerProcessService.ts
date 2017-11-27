
export interface IWorkerProcessService {
    addWorker(worker: any);

   createWorker(worker: any);

     updateWorker(worker: any);

     deleteWorker(worker: any);

     getSingleRandomWoker(sessionId: any,role: any):any;
}