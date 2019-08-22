import * as decorator from "../core/decorators/repository";
import { DynamicRepository } from '../core/dynamic/dynamic-repository';
import {SequelizeTeacher} from '../models/sequelizeTeacher';

@decorator.repository({ path: 'teacher', model: SequelizeTeacher })
export class TeacherRepository extends DynamicRepository {

}

export default TeacherRepository