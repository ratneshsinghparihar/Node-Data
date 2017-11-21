
import {field, document} from '../mongoose/decorators';
import {Strict} from '../mongoose/enums/';
import {onetomany, manytoone, manytomany, onetoone} from '../core/decorators';


export interface IWorkerProcess {

   
    machineID?: string;

   
    processId?: string;

    
    serverId: string;

   
    workerId: number;  //possible VLAUES from 1 to N

   
    staus: string; //active , idle , killed

   
    statistics?: { noOfTransactioSoFar: number, activeSince: Date, velocity: number }


}



