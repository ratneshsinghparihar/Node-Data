import Mongoose = require('mongoose');
import * as Utils from "../core/metadata/utils";
import {searchUtils} from "../search/elasticSearchUtils";
var MongooseSchema = Mongoose.Schema;


export interface IMongooseSchemaOptions {
    options: Object,
    searchIndex: boolean;
}

class MongooseSchemaGenrator {
    createSchema(parsedSchema: any, mongooseOptions: IMongooseSchemaOptions): Object {
        var mongooseSchemaObj = new MongooseSchema(parsedSchema, mongooseOptions.options);
        if (mongooseOptions.searchIndex) {
            searchUtils.insertMongoosasticToSchema(mongooseSchemaObj);
        }
        return mongooseSchemaObj;
    }
}

export var schemaGenerator = new MongooseSchemaGenrator();