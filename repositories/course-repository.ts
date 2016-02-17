import * as decorator from "../decorators/repository";
import {CourseModel} from '../models/coursemodel';

@decorator.repository('/course', CourseModel)
export default  class CourseRepository {
}
