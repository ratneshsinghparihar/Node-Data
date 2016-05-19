import {UserDetails} from './user-details';
import Q = require('q');
export interface UserDetailService {
    loadUserByUsername(userName: string): Q.Promise<any>;
    loadUserById(id: number): Q.Promise<any>;
    loadUserByField(field: any, value: any): Q.Promise<any>;
    createNewUser(userObject): Q.Promise<any>;
    updateExistingUser(id, userObject): Q.Promise<any>;
    getNewUser(req, res);
}