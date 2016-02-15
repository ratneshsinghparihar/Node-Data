
import {DynamicSchema} from './dynamic-schema';
import * as Utils from "../decorators/metadata/utils";
import {DynamicRepository} from './dynamic-repository';
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';

export var mongooseRepoMap: { [key: string]: { fn: Function, repo: any } } = { };
export var  mongooseSchemaMap: { [key: string]: { schema: any, name: string, fn: any } } = { };
export var mongooseNameSchemaMap: { [key: string]: any } = {};

export class InitializeRepositories {
    constructor(repositories: Array<Function>) {
        this.initializeRepo(repositories);
    }

    private initializeRepo(repositories: Array<Function>) {
        var schemas: { [key: string]: DynamicSchema } = {};
        var parsedSchema: { [key: string]: any } = {};

        repositories.forEach((value, index) => {
            try {
                var a; //undefined
            var schemaName = Utils.getMetaData(value.prototype.model.prototype, "document").params['name']; // model name i.e. schema name
            var schema = new DynamicSchema(value.prototype.model.prototype, schemaName);
            schemas[value.prototype.path] = schema;
            parsedSchema[schema.schemaName] = schema;
            } catch (error) {
                
            }
            
        });

        this.resolveMongooseRelation(schemas, parsedSchema);

        repositories.forEach((value, index) => {
            try {
                 var schema: DynamicSchema = schemas[value.prototype.path];
            var mongooseSchema = schema.getSchema();
            mongooseSchemaMap[value.prototype.path] = { schema: mongooseSchema, name: schema.schemaName, fn: value };
            mongooseNameSchemaMap[schema.schemaName] = mongooseSchema;
            } catch (error) {
                
            }
           
        });


        for (var path in mongooseSchemaMap) {
            var schemaMapVal = mongooseSchemaMap[path];
            mongooseRepoMap[path] = {
                fn: mongooseSchemaMap[path].fn,
                repo: new DynamicRepository(schemaMapVal.name, schemaMapVal.fn.prototype.model, schemaMapVal.schema)
            };
        }

        //var userModel = this.mongooseRepoMap['/user'].repo.addRel();
        //var roleModel = this.mongooseRepoMap['/role'].repo.addRel();
        //var userModel = this.mongooseRepoMap['/user'].repo.getModel();
        //var roleModel = this.mongooseRepoMap['/role'].repo.getModel();

        ////var user1 = new userModel({ "_id": Math.random() + new Date().toString(), 'name': 'u1' });
        ////var user2 = new userModel({ "_id": Math.random() + new Date().toString(), 'name': 'u2' });

        ////var role1 = new roleModel({ "_id": Math.random() + new Date().toString(), 'name': 'r1' });
        ////var role2 = new roleModel({ "_id": Math.random() + new Date().toString(), 'name': 'r2' });

        //var user1 = new userModel({ 'name': 'u1' });
        //var user2 = new userModel({ 'name': 'u2' });

        //var role1 = new roleModel({ 'name': 'r1' });
        //var role2 = new roleModel({ 'name': 'r2' });

        ////user1.roles = [role1, role2];
        ////user2.roles = [role1, role2];
        //this.mongooseRepoMap['/role'].repo.saveObjs([role1, role2])
        //    .then((msg) => {

        //        user1.roles.push(<any>role1._id);
        //        user1.roles.push(<any>role2._id);

        //        user2.roles.push(<any>role1._id);
        //        user2.roles.push(<any>role2._id);
        //        this.mongooseRepoMap['/user'].repo.saveObjs([user1, user2])
        //            .then((msg) => {

        //                role1.users.push(<any>user1._id);
        //                role2.users.push(<any>user1._id);

        //                role1.users.push(<any>user2._id);
        //                role2.users.push(<any>user2._id);

        //                this.mongooseRepoMap['/role'].repo.put(role1._id, role1)
        //                    .then((msg) => { console.log(msg); });
        //                this.mongooseRepoMap['/role'].repo.put(role2._id, role2)
        //                    .then((msg) => { console.log(msg); });

        //            });
        //    });
    }

    private resolveMongooseRelation(schemas: { [key: string]: DynamicSchema }, parsedSchema: { [key: string]: any }){
        for (var key in schemas) {
            schemas[key].parsedSchema = this.appendReltaion(schemas[key].parsedSchema, [schemas[key].schemaName], -1, 0, parsedSchema, true);
        }
    }

    private appendReltaion(node: { [key: string]: any }, visited: [string], depth: number, level: number, models: { [key: string]: DynamicSchema }, rootNode: boolean): {} {
        if (depth === level) {
            return;
        }
        var schem = {};
        for (var key in node) {
            if (node[key].ref) {
                var metaData = <Utils.MetaData>node[key].metaData;
                var param = metaData.propertyType;
                var primaryKey = Utils.getPrimaryKeyOfModel(param.itemType);
                var primaryKeyType = Utils.getMetaDataForField(metaData.target, primaryKey).propertyType.itemType;
                primaryKeyType = primaryKeyType ? primaryKeyType : String; // If undefined then use string
                var isEmbedded = false;

                // update schema with primary key if same object is encountered
                if (visited.indexOf(param.rel) > -1) {
                    schem[key] = param.isArray ? [primaryKeyType] : primaryKeyType;
                }
                else {
                    if (!param.embedded) {
                        schem[key] = param.isArray ? [primaryKeyType] : primaryKeyType;
                    }
                    else {
                        isEmbedded = true;
                        visited.push(param.rel);
                        var ret = {};
                        if (rootNode) {
                            ret = this.appendReltaion(models[param.rel].parsedSchema, visited, param.level, 0, models, false);
                        }
                        else {
                            ret = this.appendReltaion(models[param.rel].parsedSchema, visited, depth, level + 1, models, false);
                        }

                        // check if array
                        schem[key] = param.isArray ? [ret] : ret;
                        var name = visited.pop();
                    }
                }
                //Utils.updateModelLinks(metaData, isEmbedded);
            }
            else {
                schem[key] = node[key];
            }
        }
        return schem;
    }

}