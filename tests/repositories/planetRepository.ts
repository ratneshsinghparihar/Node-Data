import {repository} from "../../core/decorators";
import {DynamicRepository} from "../../core/dynamic/dynamic-repository";
import {planet} from '../models/planet';

@repository({ path: 'planet', model: planet })
export class PlanetRepository extends DynamicRepository {

}
export default PlanetRepository;