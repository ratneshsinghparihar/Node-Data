import * as decorator from "../decorators/repository";
import {StudentModel} from '../models/studentmodel';

@decorator.repository('/student', StudentModel)
export default class StudentRepository {
}
