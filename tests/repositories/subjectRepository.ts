import {repository, allowanonymous} from "../../core/decorators";
import {subject} from '../models/subject';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';
import {preauthorize} from '../../core/decorators/preauthorize';
import {postfilter} from '../../core/decorators/postfilter';
import {AuthorizationRepository} from './security/AuthorizationRepository';
import {entityAction, EntityActionParam} from '../../core/decorators/entityAction';

@repository({ path: 'subject', model: subject })
export default class CourseRepository extends AuthorizationRepository {

    //@authorize({ roles: ['ROLE_A'] })
    //@postfilter({ serviceName: "preauthservice", methodName: "PostFilter" })
    @preauthorize({ serviceName: "preauthservice", methodName: "CanEdit" })//, params: { id: '#id', entity: '#entity', other: [false] } })
    @allowanonymous()
    findAll(): Q.Promise<any> {
        return super.findAll();
    }

    @preauthorize({ serviceName: "preauthservice", methodName: "CanEdit1" })
    doProcess(id: any, val: any) {
        return 'success';
    }

    @preauthorize({ serviceName: "preauthservice", methodName: "CanEdit1" })
    @postfilter({ serviceName: "preauthservice", methodName: "PostFilter" })
    public findByField(fieldName, value): Q.Promise<any> {
        return super.findByField(fieldName, value);
    }

    preRead(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.when(params);
    }

    postRead(params: EntityActionParam): Q.Promise<any> {
        return Q.when(params);
    }

    preBulkRead(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params);
    }

    postBulkRead(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params);
    }
}
