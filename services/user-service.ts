import Config = require( "../config" );
import {service} from '../decorators/service';

@service()
export class UserService {
    getUser(id: number) {
        console.log('UserService - getUser Called');
        return null;
    }

    getAllUsers() {
        console.log('UserService - getAllUsers Called');
        return [];
    }
}