import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';

@document({ name: 'subject', strict: Strict.throw })
export class subject extends baseModel {
    
}

export default subject;