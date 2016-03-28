import {repository} from "../../core/decorators";
import {StudentModel} from '../models/studentmodel';

@repository({ path: 'students', model: StudentModel })
export default class StudentRepository {
     constructor() {}
}
