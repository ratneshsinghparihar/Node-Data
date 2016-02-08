var dc = require('./dynamic-controller');
var dynamic_repository_1 = require('./dynamic-repository');
var fs = require('fs');
var path = require('path');
var Utils = require("../decorators/metadata/utils");
var param_type_custom_1 = require('../decorators/metadata/param-type-custom');
var Mongoose = require("mongoose");
var schema = Mongoose.Schema;
var Dynamic = (function () {
    function Dynamic() {
        var files = fs.readdirSync('repositories1');
        var aa = [];
        files.filter(function (value) { return value.match(/[a-zA-Z0-9.]*ts$/); })
            .forEach(function (file, index, array) {
            var route = path.resolve(process.cwd(), 'repositories1\\' + file.substring(0, file.lastIndexOf('.')));
            var zz = require(route);
            //var r = new zz.default();
            //this.initRepo(zz.default.path, null);
            console.log(file);
            aa.push(zz.default);
        });
        aa.forEach(function (value, index) { return new InitRepo(aa); });
    }
    return Dynamic;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dynamic;
var InitRepo = (function () {
    function InitRepo(repositories) {
        this.mongooseRepoMap = {};
        this.mongooseSchemaMap = {};
        this.mongooseNameSchemaMap = {};
        this.initializeRepo(repositories);
        this.initializeController();
    }
    InitRepo.prototype.initializeRepo = function (repositories) {
        var _this = this;
        repositories.forEach(function (value, index) {
            var a; //undefined
            var schemaName = Utils.getAllMetaDataForDecorator(value.prototype.model.prototype, "document")[a].params['name']; // model name i.e. schema name
            var mySchema = _this.generateSchema(value.prototype.model.prototype);
            mySchema = new schema(mySchema);
            _this.mongooseSchemaMap[value.prototype.path] = { schema: mySchema, name: schemaName, fn: value };
            _this.mongooseNameSchemaMap[schemaName] = schema;
        });
        //this.resolveMongooseRelation();
        for (var path in this.mongooseSchemaMap) {
            this.mongooseRepoMap[path] = {
                fn: this.mongooseSchemaMap[path].fn,
                repo: new dynamic_repository_1.default(this.mongooseSchemaMap[path].name, this.mongooseSchemaMap[path].fn.prototype.model, this.mongooseSchemaMap[path].schema)
            };
        }
        //repositories.forEach((value, index) => {
        //    this.mongooseRepoMap[value.prototype.path] = { fn: value, repo: new dr(value.prototype.path, value.prototype.model, this.mongooseSchemaMap[value.prototype.path]) };
        //});
    };
    InitRepo.prototype.initializeController = function () {
        for (var path in this.mongooseRepoMap) {
            var controller = new dc.DynamicController(this.mongooseRepoMap[path].fn.prototype.path, this.mongooseRepoMap[path].repo);
        }
    };
    InitRepo.prototype.resolveMongooseRelation = function () {
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
    };
    InitRepo.prototype.generateSchema = function (target) {
        if (!target || !(target instanceof Object)) {
            throw TypeError;
        }
        var schema = {};
        var primaryKeyProp;
        var metaDataMapPrimary = Utils.getAllMetaDataForDecorator(target, "primary");
        for (var prop in metaDataMap) {
            // take the first
            primaryKeyProp = prop;
            break;
        }
        var metaDataMap = Utils.getAllMetaDataForAllDecorator(target);
        for (var prop in metaDataMap) {
            for (var i = 0; i < metaDataMap[prop].length; i++) {
                var dec = metaDataMap[prop][i];
                if (dec.decoratorType !== Utils.DecoratorType.PROPERTY) {
                    break;
                }
                console.log(prop);
                if (!(dec.propertyType instanceof param_type_custom_1.ParamTypeCustom)) {
                    schema[prop] = dec.propertyType;
                    continue;
                }
                if (dec.propertyType.rel) {
                    var relSchema = { type: String, ref: dec.propertyType.rel };
                    schema[prop] = dec.propertyType.type === Array ? [relSchema] : relSchema;
                    console.log();
                    //schema[prop] = {
                    //    rel: (<ParamTypeCustom>dec.propertyType).rel,
                    //    isArray: (<ParamTypeCustom>dec.propertyType).type === Array
                    //};
                    continue;
                }
                if (dec.propertyType.type === Array) {
                    schema[prop] = dec.propertyType;
                    continue;
                }
            }
        }
        return schema;
    };
    return InitRepo;
})();
exports.InitRepo = InitRepo;
//var exportObj: any = {};
//exportObj.repo = DynamicRepository;
//exportObj.router = router;
exports.repo = Dynamic;
exports.dynamicRouter = dc.router;
