import {repository} from "../../../core/decorators";
import {entityAction, EntityActionParam} from '../../../core/decorators/entityAction';
import {teacher} from '../../models/teacher';
import {DynamicRepository} from '../../../core/dynamic/dynamic-repository';
import Q = require('q');

export class AuthorizationRepository extends DynamicRepository {

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntity" }) // ACL part
    findOne(id: any): Q.Promise<any> {
        let args: Array<any> = Array.apply(null, arguments);
        let params: EntityActionParam = <EntityActionParam>args[args.length - 1];
        return this.postRead(params).then((updatedParams: EntityActionParam) => {
            return Q.resolve(updatedParams.newPersistentEntity);
        },
            (error) => {
                return Q.reject(error);
            });
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntities" }) // ACL part
    findMany(ids: Array<any>, toLoadEmbededChilds?: boolean): Q.Promise<any> {
        let actionEntities: Array<EntityActionParam> = ids;
        return this.preBulkRead(actionEntities).then((results) => {
            return this.postBulkRead(results).then((newResults) => {
                return Q.when(newResults.map(entity => entity.newPersistentEntity));
            }).catch(exc => {
                return Q.reject(exc);
            });
        }).catch(exc => {
            return Q.reject(exc);
        });
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