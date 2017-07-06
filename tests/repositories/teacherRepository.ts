import {repository} from "../../core/decorators";
import {entityAction, EntityActionParam} from '../../core/decorators/entityAction';
import {teacher} from '../models/teacher';
import {AuthorizationRepository} from './security/AuthorizationRepository';
import Q = require('q');

@repository({ path: 'teacher', model: teacher })
export class TeacherRepository extends AuthorizationRepository {

    findOne(id: any): Q.Promise<any> {
        return super.findOne(id);
    }

    findMany(ids: Array<any>, toLoadEmbededChilds?: boolean): Q.Promise<any> {
        return super.findMany(ids, toLoadEmbededChilds);
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


    doFindValue(id) {
        return this.findOne(id).then((result: teacher) => {
            //var a = result.physics_LAZY();
            //var b = result["__ghostKey_physics"];
            return result;
        });
    }

}
export default TeacherRepository;