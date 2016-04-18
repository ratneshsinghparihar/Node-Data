import {repository} from "../../core/decorators";
import {UserModel} from '../models/usermodel';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';
import {preauthorize} from '../../core/decorators/preauthorize';
var Q = require('q');

@repository({ path: 'users', model: UserModel })
export default class UserRepository extends DynamicRepository {

    doFindByName() {
    }

    doFindByNameAndAge(name: string): Q.Promise<any> {
        return Q.when(name);
        //return Q.fcall(this.getCaps(name);
    }

    getCaps(name): string {
        return name + '   ' + name;
    }

    @authorize({ roles: ['ROLE_A'] })
    doProcess(name: string) {
        return name;
    }

    @authorize({roles: ['ROLE_A']})
    public findByField(fieldName, value): Q.Promise<any> {
        return super.findByField(fieldName, value);
    }

    @authorize({ roles: ['ROLE_s'] })
    //@preauthorize({ serviceName: "", methodName: "", params: ['id','entity']})
    public findAll(): Q.Promise<any> {
        return super.findAll();
    }

}
