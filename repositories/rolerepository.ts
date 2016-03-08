
import * as role from '../models/role';
import * as decorator from "../decorators/repository";
import {RoleModel} from '../models/rolemodel';

@decorator.repository({ path: 'roles', model: RoleModel })
//@decorator.repository('/role', RoleModel)
export default class RoleRepository {

}
