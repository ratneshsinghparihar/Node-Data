import { repository } from "../../core/decorators";
import { DynamicRepository } from '../../core/dynamic/dynamic-repository';
import { ProcessControlModel } from '../models/processControlModel';

@repository({ path: 'processControl', model: ProcessControlModel })
export class ProcessControlrepository extends DynamicRepository {
}

export default ProcessControlrepository;