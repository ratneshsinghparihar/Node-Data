/// <reference path="../typings/linq/linq.3.0.3-Beta4.d.ts" />

import * as dc from './dynamic-controller';
import dr from './dynamic-repository';
var fs = require('fs');
var path = require('path');
import * as Utils from "../decorators/metadata/utils";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';

var Mongoose = require("mongoose");
var schema = Mongoose.Schema;
var Config = require('../config');
//Mongoose.connect(Config.DbConnection);

//import linq = require('../typings/linq/linq');
var Enumerable: linqjs.EnumerableStatic = require('linq');


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
            var mongooseSchema = new schema(this.generateSchema(value.prototype.model.prototype));
            this.mongooseSchemaMap[value.prototype.path] = { schema: mongooseSchema, name: schemaName, fn: value };
            this.mongooseNameSchemaMap[schemaName] = schema;
        });
        //this.resolveMongooseRelation();

        for (var path in this.mongooseSchemaMap) {
            this.mongooseRepoMap[path] = {
                fn: this.mongooseSchemaMap[path].fn,
                repo: new dr(this.mongooseSchemaMap[path].name,
                    this.mongooseSchemaMap[path].fn.prototype.model,
                    null)
            };
        }


        var userModel = this.mongooseRepoMap['/user'].repo.addRel();
        var roleModel = this.mongooseRepoMap['/role'].repo.addRel();
        var userModel = this.mongooseRepoMap['/user'].repo.getModel();
        var roleModel = this.mongooseRepoMap['/role'].repo.getModel();

        //var user1 = new userModel({ "_id": Math.random() + new Date().toString(), 'name': 'u1' });
        //var user2 = new userModel({ "_id": Math.random() + new Date().toString(), 'name': 'u2' });

        //var role1 = new roleModel({ "_id": Math.random() + new Date().toString(), 'name': 'r1' });
        //var role2 = new roleModel({ "_id": Math.random() + new Date().toString(), 'name': 'r2' });

        var user1 = new userModel({'name': 'u1' });
        var user2 = new userModel({'name': 'u2' });

        var role1 = new roleModel({'name': 'r1' });
        var role2 = new roleModel({'name': 'r2' });

        //user1.roles = [role1, role2];
        //user2.roles = [role1, role2];
        this.mongooseRepoMap['/role'].repo.saveObjs([role1, role2])
            .then((msg) => {

                user1.roles.push(<any>role1._id);
                user1.roles.push(<any>role2._id);

                user2.roles.push(<any>role1._id);
                user2.roles.push(<any>role2._id);
                this.mongooseRepoMap['/user'].repo.saveObjs([user1, user2])
                    .then((msg) => {

                        role1.users.push(<any>user1._id);
                        role2.users.push(<any>user1._id);

                        role1.users.push(<any>user2._id);
                        role2.users.push(<any>user2._id);

                        this.mongooseRepoMap['/role'].repo.put(role1._id, role1)
                            .then((msg) => { console.log(msg); });
                        this.mongooseRepoMap['/role'].repo.put(role2._id, role2)
                            .then((msg) => { console.log(msg); });

                    });
            });
    }

    private initializeController() {
        for (var path in this.mongooseRepoMap) {
            var controller = new dc.DynamicController(this.mongooseRepoMap[path].fn.prototype.path, this.mongooseRepoMap[path].repo);
        }
    }

    private generateSchema(target: Object) {
        if (!target || !(target instanceof Object)) {
            throw TypeError;
        }
        var schema = {};
        var primaryKeyProp;
        var metaDataMap = Utils.getAllMetaDataForAllDecorator(<any>target);
        for (var prop in metaDataMap) {
            // Skip autogenerated primary column
            //if (prop === primaryKeyProp) {
            //    continue;
            //}
            if (Enumerable.from(metaDataMap[prop]).any(x => x.params && x.params.isAutogenerated)) {
                continue;
            }
            Enumerable.from(metaDataMap[prop]).forEach(x => {
                var paramType = x.propertyType;
                if (x.decoratorType !== Utils.DecoratorType.PROPERTY) {
                    return;
                }
                if (paramType.rel) {
                    var relSchema = { type: String, ref: paramType.rel };
                    schema[prop] = paramType.isArray ? [relSchema] : relSchema;
                    return;
                }
                if (paramType.isArray) {
                    schema[prop] = paramType.itemType ? [paramType.itemType] : [];
                    return;
                }
                schema[prop] = paramType.itemType;
            });
        }
        return schema;
    }
}

//var exportObj: any = {};
//exportObj.repo = DynamicRepository;
//exportObj.router = router;

export var repo = Dynamic;
export var dynamicRouter = dc.router;
