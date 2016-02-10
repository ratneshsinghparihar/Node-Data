
import {DynamicSchema} from './dynamic-schema';
import * as Utils from "../decorators/metadata/utils";
import {DynamicRepository} from './dynamic-repository';

export var mongooseRepoMap: { [key: string]: { fn: Function, repo: any } } = { };
export var  mongooseSchemaMap: { [key: string]: { schema: any, name: string, fn: any } } = { };
export var  mongooseNameSchemaMap: { [key: string]: any } = { };

export class InitializeRepositories {
    constructor(repositories: Array<Function>) {
        this.initializeRepo(repositories);
    }

    private initializeRepo(repositories: Array<Function>) {
        repositories.forEach((value, index) => {
            var a; //undefined
            var schemaName = Utils.getMetaData(value.prototype.model.prototype, "document").params['name']; // model name i.e. schema name
            var mongooseSchema = new DynamicSchema(value.prototype.model.prototype);
            mongooseSchemaMap[value.prototype.path] = { schema: mongooseSchema, name: schemaName, fn: value };
            mongooseNameSchemaMap[schemaName] = mongooseSchema;
        });
        //this.resolveMongooseRelation();

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

}