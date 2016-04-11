import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {student} from './student';

export class teacher {
    schema(): {} {
        return {
            '_id': Mongoose.Schema.Types.ObjectId,
            'name': String,
            'students': Mongoose.Schema.Types.Mixed
        };
    }

    _id: Types.ObjectId;
    name: string;
    students: Array<student>;
}

export default teacher;