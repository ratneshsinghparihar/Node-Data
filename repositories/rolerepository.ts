
import * as role from '../models/role';
import base from "../dynamic/baserepository";
import * as decorator from "../decorators/repository";
import {RoleModel} from '../models/rolemodel';

@decorator.repository({ path: 'roles', model: RoleModel })
//@decorator.repository('/role', RoleModel)
export default class RoleRepository {

    constructor() {
        //super(RoleRepository.path, role.IRole);
        //new BaseRepository1(this.path, User1);
    }
}
