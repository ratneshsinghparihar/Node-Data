import Mongoose = require('mongoose');

export import ObjectId = Mongoose.Types.ObjectId;
export import Mixed = Mongoose.SchemaType;

export var Types = {
    ObjectId: ObjectId,
    Mixed: Mixed
}