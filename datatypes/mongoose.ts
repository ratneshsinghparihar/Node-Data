import Mongoose = require('mongoose');

export import ObjectId = Mongoose.Types.ObjectId;
export import Mixed = Mongoose.SchemaType;

var aa = {
    String: String,
    ObjectId: Object,
    OId: Object,
    Mixed: Object,
}
export class Schema {
    public static Types: {
        String: String;
        ObjectId: Object;
        OId: Object;
        Mixed: any;
    };

    aa() { Schema.Types.Mixed; }
}