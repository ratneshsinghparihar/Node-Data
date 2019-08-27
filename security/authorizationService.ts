import { service} from '../di/decorators';
import { EntityActionParam } from '../core/decorators/entityAction';
import Q = require('q');

@service({ singleton: true, serviceName: 'authorizationService' })
export class AuthorizationService {

    canSaveEntity(params:EntityActionParam){
        return Q.when(true);
    }

    canSaveEntities(params:Array<EntityActionParam>){
        return Q.when(true);
    }

    canReadActionEntity(params:EntityActionParam){
        return Q.when(true);
    }

    canReadActionEntities(params:Array<EntityActionParam>){
        return Q.when(true);
    }

    canReadChildren(params){
        return Q.when(true);
    }

    canDeleteEntity(params:EntityActionParam){
        return Q.when(true);
    }
}

export default AuthorizationService;