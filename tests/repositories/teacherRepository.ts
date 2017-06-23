import {repository} from "../../core/decorators";
import {teacher} from '../models/teacher';
import {DynamicRepository} from '../../core/dynamic/dynamic-repository';

@repository({ path: 'teacher', model: teacher })
export default class TeacherRepository extends DynamicRepository {

    findOne(id: any): Q.Promise<any> {

        return super.findOne(id).then((result: teacher) => {
            let a = null;
            return result.physics_LAZY().then(val => {
                a = result.physics_LAZY();
                return result.physics1_LAZY().then(val => {
                    let a = result.physics1_LAZY();
                    return result.physics1_LAZY(true).then(val => {
                        return result;
                    });
                });
            });
        });
    }

    doFindValue(id) {
        return this.findOne(id).then((result: teacher) => {
            var a = result.physics_LAZY();
            var b = result["__ghostKey_physics"];
            return result;
        });
    }
}