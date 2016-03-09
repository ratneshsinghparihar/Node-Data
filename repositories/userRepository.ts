import * as decorator from "../decorators/repository";
import {UserModel} from '../models/usermodel';
import {DynamicRepository} from '../dynamic/dynamic-repository';

@decorator.repository({ path: 'users', model: UserModel })
export default class UserRepository extends DynamicRepository {

    findByName() {
    }

    findByNameAndAge() {
    }

}
