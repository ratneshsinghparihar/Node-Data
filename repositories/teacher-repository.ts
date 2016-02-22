import * as decorator from "../decorators/repository";
import {TeacherModel} from '../models/Teachermodel';

@decorator.repository('/teacher', TeacherModel)
export default class TeacherRepository {
}
