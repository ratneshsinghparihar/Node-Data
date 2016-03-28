
import * as role from '../models/role';
import {repository} from "../../core/decorators";
import {RoleModel} from '../models/rolemodel';

@repository({ path: 'roles', model: RoleModel })
//@decorator.repository('/role', RoleModel)
export default class RoleRepository {

}
