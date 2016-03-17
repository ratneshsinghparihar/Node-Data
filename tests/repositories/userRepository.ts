import {repository} from "../../core/decorators";
import {UserModel} from '../models/usermodel';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'users', model: UserModel })
export default class UserRepository extends DynamicRepository {

    findByName() {
    }

    findByNameAndAge() {
    }

}
