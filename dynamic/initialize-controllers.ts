var Mongoose = require("mongoose");
var MongooseSchema = Mongoose.Schema;

import {DynamicController} from './dynamic-controller';
import UserRepository from '../repositories/userrepository';
import {AuthController} from '../dynamic/authcontroller'
import {MetadataController} from '../dynamic/metadataController'

export class InitializeControllers {
    constructor(mongooseRepoMap: { [key: string]: { fn: Object, repo: any } }) {
        this.initializeController(mongooseRepoMap);
    }

    private initializeController(mongooseRepoMap: { [key: string]: { fn: Object, repo: any } }) {
       
        for (var path in mongooseRepoMap) {
            var controller = new DynamicController((<any>mongooseRepoMap[path].fn).path, mongooseRepoMap[path].repo);
        }
        var authController = new AuthController("/", mongooseRepoMap['users'].repo);
        var metadataController = new MetadataController();
    }
}