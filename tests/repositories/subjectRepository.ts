import {repository} from "../../core/decorators";
import {subject} from '../models/subject';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'subject', model: subject })
export default class CourseRepository extends DynamicRepository {
}
