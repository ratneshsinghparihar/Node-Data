import * as decorator from "../decorators/repository";
import {UserModel} from '../models/usermodel';
import {DynamicRepository} from '../dynamic/dynamic-repository';
import {authorize} from '../decorators'; 

@decorator.repository({ path: 'users', model: UserModel })
export default class UserRepository extends DynamicRepository {

    findByName() {
    }

    findByNameAndAge() {
    }

    @authorize({roles: ['ROLE_ADMIN']})
    findByField(name: string, value: string): any {

    }

    @authorize({ roles: ['ROLE_ADMIN'] })
    findAll(): any {

    }

    @authorize({ roles: ['ROLE_ADMIN'] })
    findOne(id: any): any {

    }

}
