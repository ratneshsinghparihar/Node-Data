import {repository} from "../../core/decorators";
import {DynamicRepository} from "../../core/dynamic/dynamic-repository";
import {inject} from "../../di/decorators";
import {entityAction, EntityActionParam} from '../../core/decorators/entityAction';
import {teacher} from '../models/teacher';
import {AuthorizationRepository} from '../../repositories/authorizationRepository';
import * as TeacherService from '../services/teacherService';
import {Types} from 'mongoose';
import Q = require('q');

@repository({ path: 'teacher', model: teacher })
export class TeacherRepository extends DynamicRepository {

    @inject(TeacherService)
    private _teacherService: TeacherService.TeacherService;

    findOne(id, donotLoadChilds?: boolean): Q.Promise<any> {
        return super.findOne(id).then(x => {
            return super.findOne(id).then(r => {
                let re = r;
                return re;
            });
        });
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
            var a = result.physics_LAZY();
            return result;
        });
    }

    doAddTeacherWorker(obj: teacher) {
        return this._teacherService.addTeacherWorker(obj);
    }

    doAddTeacherProcessControl(obj: teacher) {
        return this._teacherService.addTeacherProcessControl(obj);
    }

    doUpdateTeacherProcessControlAndWorker(obj: teacher) {
        return this._teacherService.addTeacherProcessControlAndWorker(obj);
    }

    doLongTask() {
        return this._teacherService.longTask();
    }

    doUpdateMany(ids, obj) {
        return this.bulkPutMany(ids, obj);;
    }

    doFindWhere() {
        return this.findWhere({
            _id: {
                $in: [Types.ObjectId("596a72000f404ef43c8e1a5a"), Types.ObjectId("59a3dee5c21673e8200c6d8f")]
            }
        }).then(rs => {
            return this.findMany([Types.ObjectId("596a72000f404ef43c8e1a5a"), Types.ObjectId("59a3dee5c21673e8200c6d8f")]).then(r => {
                return this.delete(Types.ObjectId("596a72000f404ef43c8e1a5a")).then(d => {
                    return this.findMany([Types.ObjectId("596a72000f404ef43c8e1a5a"), Types.ObjectId("59a3dee5c21673e8200c6d8f")]).then(r => {
                        let t = r;
                        return t;
                    });
                });
            });
        });

    }

}
export default TeacherRepository;