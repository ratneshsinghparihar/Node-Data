import {AuthService} from '../../security/auth/auth-service';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
import {User} from '../../security/auth/user';
import {UserDetails} from '../../security/auth/user-details';
import Q = require('q');
export class MockAuthService {

    authenticate() {
        console.log('mock service message');
    }

    mockRepo = new UserRepositoryMock();
    loadUserByUsername(userName: string): Q.Promise<any> {
        var userDetail: UserDetails;
        return this.mockRepo.findByField("name", "a").then((user) => {
            userDetail = new User(user.name, user.password, user);
            return userDetail;
        });
    };
    loadUserById(id: number): Q.Promise<any> {
        var userDetail: UserDetails;
        return this.mockRepo.findByField("name", "a").then((user) => {
            userDetail = new User(user.name, user.password, user);
            return userDetail;
        });
    };
    loadUserByField(field: any, value: any): Q.Promise<any> {
        var userDetail: UserDetails;
        return this.mockRepo.findByField("name", "a").then((user) => {
            userDetail = new User(user.name, user.password, user);
            return userDetail;
        });
    };
    createNewUser(userObject): Q.Promise<any> {
        var userDetail: UserDetails;
        return this.mockRepo.findByField("name", "a").then((user) => {
            userDetail = new User(user.name, user.password, user);
            return userDetail;
        });
    };
    updateExistingUser(id, userObject): Q.Promise<any> {
        var userDetail: UserDetails;
        return this.mockRepo.findByField("name", "a").then((user) => {
            userDetail = new User(user.name, user.password, user);
            return userDetail;
        });
    };
}