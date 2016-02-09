import {onetomany, manytoone, manytomany} from '../decorators/association';
import {document} from '../decorators/document';
import {field} from '../decorators/field';

import {UserModel} from './usermodel';

@document({ name: 'roles' })
export class RoleModel{
    @field()
    public _id: number;
    
    @field()
    public name: string;
    
    // @manytoone({rel: 'users'})
    // public user: UserModel;
}
