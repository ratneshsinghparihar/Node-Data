import {repository} from "../../core/decorators";
import {teacher} from '../models/teacher';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'teacher', model: teacher })
export default class TeacherRepository extends DynamicRepository {
}
