import {repository} from "../../core/decorators";
import {UserModel} from '../models/usermodel';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';

@repository({ path: 'users', model: UserModel })
export default class UserRepository extends DynamicRepository {

    findByName() {
    }

    findByNameAndAge() {
    }

    //@authorize({roles: ['ROLE_ADMIN']})
    //public findByField(fieldName, value): Q.Promise<any> {
    //    return super.findByField(fieldName, value);
    //}

}
