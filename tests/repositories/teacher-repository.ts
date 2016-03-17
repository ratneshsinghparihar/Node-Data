import {repository} from "../../core/decorators";
import {TeacherModel} from '../models/Teachermodel';

@repository({ path: 'teachers', model: TeacherModel })
export default class TeacherRepository {
     constructor() {}
}
