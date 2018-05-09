import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';
import {topic} from './topic';
import {onetomany, manytoone, manytomany, onetoone, promisable, IPromisableFetchParam} from '../../core/decorators';
import { StorageType } from "../../core/enums/index";

@document({ name: 'subject', strict: Strict.false })
export class subject extends baseModel {

    constructor(object?: any) {
        super(object);
        if (!object || !object._id) {
            this.createdDate = Date.now().toString();
        }
        // set default properties
        this.updatedDate = Date.now().toString();
    }

    @field()
    createdDate: string;

    @field()
    updatedDate: string;

    // sharding: dynamic collection example
    @onetomany({ rel: 'topic', itemType: topic, embedded: true, persist: true, eagerLoading: false, deleteCascade: true, storageType: StorageType.JSONMAP })
    topicOTM: Array<topic>;
}

export default subject;