import {repository, allowanonymous, OptimisticLocking} from "../../core/decorators";
import {OptimisticLockType} from "../../core/enums/optimisticlock-type";
import {subject} from '../models/subject';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {authorize} from '../../core/decorators/authorize';
import {preauthorize} from '../../core/decorators/preauthorize';
import {postfilter} from '../../core/decorators/postfilter';
import {AuthorizationRepository} from './security/AuthorizationRepository';
import {entityAction, EntityActionParam} from '../../core/decorators/entityAction';
import Q = require('q');

@repository({ path: 'subject', model: subject })
export default class CourseRepository extends AuthorizationRepository {

    //@authorize({ roles: ['ROLE_A'] })
    //@postfilter({ serviceName: "preauthservice", methodName: "PostFilter" })
    @preauthorize({ serviceName: "preauthservice", methodName: "CanEdit" })//, params: { id: '#id', entity: '#entity', other: [false] } })
    @allowanonymous()
    findAll(): Q.Promise<any> {
        return super.findAll();
    }

    //@OptimisticLocking({ type: OptimisticLockType.VERSION })
    put(id: any, obj: any): Q.Promise<any> {
        return super.put(id, obj);
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
        let curEntity = params.newPersistentEntity;
        if (curEntity.delete) {
            return Q.when(undefined);
        }
      return Q.when(params);
    }

    postBulkRead(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params.filter((entity) => { return !entity.newPersistentEntity.delete }));
    }

    preBulkRead(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params);
    }
}
