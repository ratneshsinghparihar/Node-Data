import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';
import {school} from './school';
import {onetomany, manytoone, manytomany, onetoone} from '../../core/decorators';

@document({ name: 'city', strict: Strict.throw })
export class city extends baseModel {
    @field()
    age: string;

    @field()
    createdDate: string;

    @field()
    updatedDate: string;

    @onetomany({ rel: 'school', itemType: school, embedded: true, persist: true, eagerLoading: false, deleteCascade: true, properties: ['name'] })
    //@onetomany({ rel: 'school', itemType: school, embedded: true, persist: true, eagerLoading: false})
    schools: Array<school>;
}

export default city;