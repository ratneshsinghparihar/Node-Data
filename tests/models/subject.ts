import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';

@document({ name: 'subject', strict: Strict.throw })
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
}

export default subject;