import * as RM from './rolemodel';
import {onetomany, manytoone, manytomany} from '../../core/decorators';
import {field, document} from '../../mongoose/decorators'; import {IUser} from './user';
import {Types} from 'mongoose';
import {Strict} from '../../mongoose/enums/';
import * as r from './rolemodel';

@document({ name: 'users', strict: Strict.true })
export class UserModel {
    @field({ primary: true, autogenerated: true })
    _id: Types.ObjectId;

    @field()
    name: string;

    @field({ itemType: String})
    courses: Array<string>;

    @field()
    email: string;

    @field()
    accessToken: string;

    @field()
    refreshToken: string;

    @field()
    password: string;

    @field()
    age: string;
}

export default UserModel;