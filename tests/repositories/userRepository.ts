import {repository} from "../../core/decorators";
import {UserModel} from '../models/usermodel';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';
import {preauthorize} from '../../core/decorators/preauthorize';
var Q = require('q');

@repository({ path: 'users', model: UserModel })
export default class UserRepository extends DynamicRepository {

    //@authorize({ roles: ['ROLE_A'] })
    //@preauthorize({ serviceName: "preauthservice", methodName: "CanEditWithParams", params: { id: '#id', entity: '#entity' } })
    findAll(): Q.Promise<any> {
        return super.findAll();
    }

    doFindByName() {
    }

    doFindByNameAndAge(name: any): Q.Promise<any> {
        return Q.when(name);
        //return Q.fcall(this.getCaps(name);
    }

    getCaps(name): string {
        return name + '   ' + name;
    }

    @authorize({ roles: ['ROLE_A'] })
    @preauthorize({ serviceName: "preauthservice", methodName: "CanEdit" })// params: { id: '#id', entity: '#entity' } })
    doProcess(name: string, nam: string, type: any) {
        return type;
    }

    @preauthorize({ serviceName: "preauthservice", methodName: "CanEditWithParams" })// params: { id: '#id', entity: '#entity', other: [false] } })
    doProcess1(name: boolean) {
        return name;
    }

    @authorize({roles: ['ROLE_A']})
    public findByField(fieldName, value): Q.Promise<any> {
        return super.findByField(fieldName, value);
    }

}
