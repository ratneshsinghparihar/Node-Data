import Mongoose = require('mongoose');

export function castToMongooseType(value, schemaType) {
    var newVal;
    switch (schemaType) {
        case Mongoose.Types.ObjectId:
            if (value instanceof Mongoose.Types.ObjectId) {
                newVal = value;
            } else if (typeof value === 'string') {
                newVal = new Mongoose.Types.ObjectId(value);
            } else {
                throw 'cannot cast to primary key type';
            }
            break;
        case String:
            if (typeof value === 'string') {
                newVal = value;
            }
            newVal = value.toString();
            break;
        case Number:
            if (typeof value === 'number') {
                newVal = value;
            }
            newVal = parseInt(value);
            if (isNaN(newVal)) {
                throw 'cannot cast to primary key type';
            }
            break;
        default: newVal = value; break;
    }
    return newVal;
}