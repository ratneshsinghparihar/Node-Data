import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';
import {teacher} from './teacher';
import {onetomany, manytoone, manytomany, onetoone} from '../../core/decorators';

@document({ name: 'school', strict: Strict.throw })
export class school extends baseModel {
    @field()
    age: string;

    @onetomany({ rel: 'teacher', itemType: teacher, embedded: true, persist: true, eagerLoading: false, deleteCascade: true, properties: ['name'] })
    //@onetomany({ rel: 'teacher', itemType: teacher, embedded: true, persist: true, eagerLoading: false})
    teachers: Array<teacher>;
}

export default school;