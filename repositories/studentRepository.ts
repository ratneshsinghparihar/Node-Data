import * as decorator from "../core/decorators/repository";
import { DynamicRepository } from '../core/dynamic/dynamic-repository';
import {SequelizeStudent} from '../models/sequelizeStudent';

@decorator.repository({ path: 'student', model: SequelizeStudent })
export class StudentRepository extends DynamicRepository {

}

export default StudentRepository