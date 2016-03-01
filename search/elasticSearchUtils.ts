var mongoosastic = require("mongoosastic");
var elasticsearch = require("elasticsearch");

import {Config} from "../config"; 

/**
 * ElastticSearchUtils
 */
class ElastticSearchUtils {
    private esClient: any;
    constructor() {
        if (Config.ApplyElasticSearch) {
            this.esClient = new elasticsearch.Client({ host: Config.ElasticSearchConnection });
        }
    }

    insertMongoosasticToSchema(schema: any) {
        if (Config.ApplyElasticSearch) {
            schema.plugin(mongoosastic, {
                esClient: this.esClient
            });
        }
    }

    registerToMongoosastic(mongooseModel: any) {
        // This will be called only in the case if the mongoosastic plugin was attached to the mongoose model.
        if (Config.ApplyElasticSearch && mongooseModel.createMapping) {
            mongooseModel.createMapping((err: any, mapping: any) => {
                if (err) {
                    console.error(err);
                }
                else {
                    console.log(mapping);
                }
            });
        }
    }
}

export var searchUtils = new ElastticSearchUtils();