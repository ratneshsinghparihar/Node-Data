import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {subject} from './subject';
import {field, document, transient} from '../../mongoose/decorators';
import {Strict} from '../../mongoose/enums/';
import {onetomany, manytoone, manytomany, onetoone} from '../../core/decorators';
import {baseModel} from './baseModel';

@document({ name: 'teacher', strict: Strict.false })
export class teacher extends baseModel {

    @transient()
    isSinger : boolean;
    
    @onetoone({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false })
    courseOTO: subject;

    @onetoone({ rel: 'subject', itemType: subject, embedded: false, persist: true, eagerLoading: false })
    courseIdOTO: subject;

    @onetomany({ rel: 'subject', itemType: subject, embedded: true, persist: true, eagerLoading: false })
    courseOTM: Array<subject>;

    @onetomany({ rel: 'subject', itemType: subject, embedded: false, persist: true, eagerLoading: false })
    courseIdOTM: Array<subject>;
}

export default teacher;