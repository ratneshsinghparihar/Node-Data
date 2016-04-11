import {repository} from "../../core/decorators";
import {CourseModel} from '../models/coursemodel';


@repository({ path: 'courses', model: CourseModel })
//@decorator.repository('/courses', CourseModel)
export default  class CourseRepository {
    constructor() {}
}
