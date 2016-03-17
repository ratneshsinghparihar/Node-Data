import {repository} from "../../core/decorators";
import {CourseModel} from '../models/coursemodel';


@repository({ path: 'course', model: CourseModel })
//@decorator.repository('/course', CourseModel)
export default  class CourseRepository {
    constructor() {}
}
