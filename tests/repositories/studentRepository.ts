import {repository} from "../../core/decorators";
import {student} from '../models/student';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'student', model: student })
export default class StudentRepository extends DynamicRepository {
}
