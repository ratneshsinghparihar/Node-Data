import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {subject} from './subject';
import {field, document, transient} from '../../mongoose/decorators';
import {Strict} from '../../mongoose/enums/';
import {onetomany, manytoone, manytomany, onetoone, promisable, IPromisableFetchParam} from '../../core/decorators';
import {baseModel} from './baseModel';
import { StorageType } from "../../core/enums/index";

@document({ name: 'teacher', strict: Strict.false })
export class teacher extends baseModel {

    @transient()
    isSinger: boolean;

    @onetoone({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false, deleteCascade: true })
    courseOTO: subject;

    @onetoone({ rel: 'subject', itemType: subject, embedded: false, persist: true, eagerLoading: false, deleteCascade: true })
    courseIdOTO: subject;

    @onetomany({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false, deleteCascade: true })
    courseOTM: Array<subject>;

    @onetomany({ rel: 'subject', itemType: subject, embedded: false, persist: true, eagerLoading: false, deleteCascade: true })
    courseIdOTM: Array<subject>;

    @onetomany({ rel: 'subject', itemType: subject, embedded: false, persist: true, eagerLoading: false, deleteCascade: true })
    physics: Array<subject>;

    @promisable({ targetKey: "physics" })
    physics_LAZY: (param?: IPromisableFetchParam) => Promise<any> | any;

    @onetomany({ rel: 'subject', itemType: subject, embedded: false, persist: true, eagerLoading: false, deleteCascade: true })
    physics1: Array<subject>;

    @promisable({ targetKey: "physics1" })
    physics1_LAZY: (param?: IPromisableFetchParam) => Promise<any> | any;

    @onetoone({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false, deleteCascade: true })
    physicsOne: subject;

    @onetomany({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false, deleteCascade: true })
    physicsMany: Array<subject>;

    @onetomany({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false, storageType: StorageType.JSONMAP, deleteCascade: true })
    jsonCourseOTM: Array<subject>;

}

export default teacher;