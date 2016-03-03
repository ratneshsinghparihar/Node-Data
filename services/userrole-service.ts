import Config = require( "../config" );
import {Container} from '../di';
import {UserService} from './user-service';
import {RoleService} from './role-service';
import {service, inject} from '../decorators';

@service()
export class UserRoleService {

    @inject()
    public uu: UserService;

    @inject()
    public rs: RoleService;

    @inject()
    public static rss: RoleService;

    constructor(@inject(UserService) private userService, @inject(RoleService) private roleService) {
    }

    getOne() {
        this.uu.getUser(12);
        this.rs.getRole(12);
        UserRoleService.rss.getRole(12);
        this.userService.getUser(12);
        this.roleService.getRole(12);
        return null;
    }

    getAll() {
        this.uu.getAllUsers();
        this.rs.getAllRoles();
        UserRoleService.rss.getAllRoles();
        this.userService.getAllUsers();
        this.roleService.getAllRoles();
        return [];
    }
}