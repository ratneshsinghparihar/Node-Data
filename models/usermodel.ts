import {RoleModel} from './rolemodel';
import {onetomany, manytoone, manytomany} from '../decorators/association';
import {document} from '../decorators/document'; 
import {field} from '../decorators/field'; 
import {IUser} from './user.ts';

import * as r from './rolemodel';

@document({ name: 'users' })
export class UserModel {
    @field()
    _id: string;


    @field()
    name: string;

    @field({ itemType: String })
    courses: Array<string>;

    @onetomany({ mappedBy: 'user', rel: 'roles'})
    roles: Array<RoleModel>;

    @field()
    _links: any;  
    
    // constructor(){
    //     this._id=0;
    //     this.name="";
    //     this.roles=new Array<RoleModel>();
    // }
    constructor(userDto: IUser) {
        this._links = {};
        this._id = userDto._id;
        this.name = userDto.name;
        if (userDto.roles)
            this.roles = userDto.roles;
    }
}