import {repository} from "../../core/decorators";
import {city} from '../models/city';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'city', model: city })
export default class CityRepository extends DynamicRepository {
}
