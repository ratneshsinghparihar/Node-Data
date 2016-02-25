import base from "../dynamic/baserepository";
import * as decorator from "../decorators/repository";
import {UserModel} from '../models/usermodel';

@decorator.repository({ path: 'users', model: UserModel })
//@decorator.repository('/user', UserModel)
export default  class UserRepository {

    findByName() {
    }

    findByNameAndAge() {
    }

}
