import Config = require( "../config" );
import {service} from '../decorators/service';

@service()
export class RoleService {
    getRole(id: number) {
        console.log('RoleService - getRole Called');
        return null;
    }

    getAllRoles() {
        console.log('RoleService - getAllRoles Called');
        return [];
    }
}