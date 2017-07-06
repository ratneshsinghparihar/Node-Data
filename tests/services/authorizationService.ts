
import {inject, injectbyname} from '../../di/decorators/inject';
import {service} from '../../di/decorators/service';
import {entityAction, EntityActionParam} from '../../core/decorators/entityAction';
import Q = require('q');

@service({ singleton: true, serviceName: 'authorizationService' })
export class AuthorizationService {

    public canReadActionEntity(params: EntityActionParam) {
        return params.newPersistentEntity;
    }

    public canReadActionEntities(actionEntities: Array<EntityActionParam>) {
        // TODO: need to return tri state entity (new, old, merged) when all get actions 
        //       (findOne, findAll, findwhere, findmany etc) will be implemented in EntityAction annotation
        let readableEntities = new Array<any>();
        actionEntities.forEach(entity => {
            let qualifiedEntity = this.canReadActionEntity(entity);
            qualifiedEntity && readableEntities.push(qualifiedEntity);
        });

        return readableEntities;
    }
}

