import * as dc from './dynamic-controller';
import dr from './dynamic-repository';
var fs = require('fs');
var path = require('path');
import * as Utils from "../decorators/metadata/utils";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';

var Mongoose = require("mongoose");
var schema = Mongoose.Schema;

export default class Dynamic {
    constructor() {
        var files = fs.readdirSync('repositories1');
        var aa = [];
        files.filter((value) => value.match(/[a-zA-Z0-9.]*ts$/))
            .forEach((file: string, index: number, array) => {
                var route = path.resolve(process.cwd(), 'repositories1\\' + file.substring(0, file.lastIndexOf('.')));
                var zz = require(route);
                //var r = new zz.default();
                //this.initRepo(zz.default.path, null);
                console.log(file);
                aa.push(zz.default);
            });
        aa.forEach((value, index) => new InitRepo(aa));
    }
}

export class InitRepo {
    private mongooseRepoMap: { [key: string]: { fn: Function, repo: any } } = {};
    private mongooseSchemaMap: { [key: string]: { schema: any, name: string, fn: any } } = {};
    private mongooseNameSchemaMap: { [key: string]: any } = {};
    constructor(repositories: Array<Function>) {
        this.initializeRepo(repositories);
        this.initializeController();
    }

    private initializeRepo(repositories: Array<Function>) {
        repositories.forEach((value, index) => {
            var a; //undefined
            var schemaName = Utils.getAllMetaDataForDecorator(value.prototype.model.prototype, "document")[a].params['name']; // model name i.e. schema name
            var mySchema = this.generateSchema(value.prototype.model.prototype);
            mySchema = new schema(mySchema);
            this.mongooseSchemaMap[value.prototype.path] = { schema: mySchema, name: schemaName, fn: value };
            this.mongooseNameSchemaMap[schemaName] = schema;
        });
        //this.resolveMongooseRelation();

        for (var path in this.mongooseSchemaMap) {
            this.mongooseRepoMap[path] = {
                fn: this.mongooseSchemaMap[path].fn,
                repo: new dr(this.mongooseSchemaMap[path].name,
                    this.mongooseSchemaMap[path].fn.prototype.model,
                    this.mongooseSchemaMap[path].schema)
            };
        }
        //repositories.forEach((value, index) => {
        //    this.mongooseRepoMap[value.prototype.path] = { fn: value, repo: new dr(value.prototype.path, value.prototype.model, this.mongooseSchemaMap[value.prototype.path]) };
        //});
    }

    private initializeController() {
        for (var path in this.mongooseRepoMap) {
            var controller = new dc.DynamicController(this.mongooseRepoMap[path].fn.prototype.path, this.mongooseRepoMap[path].repo);
        }
    }

    private resolveMongooseRelation() {
        for (var path in this.mongooseSchemaMap) {
            var schema = this.mongooseSchemaMap[path].schema;
            for (var schemaProp in schema) {
                // if any contains relation, replace with the proper schema
                if (schema[schemaProp].rel) {
                    //var relSchema: any = this.mongooseNameSchemaMap[schema[schemaProp].rel];
                    var relSchema = { type: String, ref: schema[schemaProp].rel };
                    schema[schemaProp] = schema[schemaProp].isArray ? [relSchema] : relSchema;
                    console.log();
                }
            }
        }
    }

    private generateSchema(target: Object) {
        if (!target || !(target instanceof Object)) {
            throw TypeError;
        }
        var schema = {};
        var primaryKeyProp;
        var metaDataMapPrimary = Utils.getAllMetaDataForDecorator(<any>target, "primary");
        for (var prop in metaDataMap) {
            // take the first
            primaryKeyProp = prop;
            break;
        }
        var metaDataMap = Utils.getAllMetaDataForAllDecorator(<any>target);
        for (var prop in metaDataMap) {
            for (var i = 0; i < metaDataMap[prop].length; i++) {
                var dec = metaDataMap[prop][i];
                if (dec.decoratorType !== Utils.DecoratorType.PROPERTY) {
                    break;
                }
                console.log(prop);
                if (!(dec.propertyType instanceof ParamTypeCustom)) {
                    schema[prop] = dec.propertyType;
                    continue;
                }
                if ((<ParamTypeCustom>dec.propertyType).rel) {
                    var relSchema = { type: String, ref: (<ParamTypeCustom>dec.propertyType).rel };
                    schema[prop] = (<ParamTypeCustom>dec.propertyType).type === Array ? [relSchema] : relSchema;
                    console.log();
                    //schema[prop] = {
                    //    rel: (<ParamTypeCustom>dec.propertyType).rel,
                    //    isArray: (<ParamTypeCustom>dec.propertyType).type === Array
                    //};
                    continue;
                }
                if ((<ParamTypeCustom>dec.propertyType).type === Array) {
                    schema[prop] = dec.propertyType;
                    continue;
                }

            }
        }
        return schema;
    }
}

//var exportObj: any = {};
//exportObj.repo = DynamicRepository;
//exportObj.router = router;

export var repo = Dynamic;
export var dynamicRouter = dc.router;
