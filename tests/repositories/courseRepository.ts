import {repository} from "../../core/decorators";
import {course} from '../models/course';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'course', model: course })
export default class CourseRepository extends DynamicRepository {
}
