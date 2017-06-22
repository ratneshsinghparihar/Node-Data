import {repository} from "../../core/decorators";
import {postfilter} from "../../core/decorators/postfilter";
import {teacher} from '../models/teacher';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'promisableTest', model: teacher })
export default class PromisableTestRepository extends DynamicRepository {

    findOne(id: any): Q.Promise<any> {
        return super.findOne(id).then((result: teacher) => {
            return result.physics_LAZY.then(() => {
                return result;
            });
        });
    }

}