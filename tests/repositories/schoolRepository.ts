import {repository} from "../../core/decorators";
import {school} from '../models/school';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'school', model: school })
export default class SchoolRepository extends DynamicRepository {
}
