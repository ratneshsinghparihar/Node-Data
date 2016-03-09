
import * as decorator from "../decorators/repository";
import {RoleModel} from '../models/rolemodel';

@decorator.repository({ path: 'roles', model: RoleModel })
export default class RoleRepository {

}
