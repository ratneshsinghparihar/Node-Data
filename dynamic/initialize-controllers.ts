var Mongoose = require("mongoose");
var MongooseSchema = Mongoose.Schema;

import {DynamicController} from './dynamic-controller';
import UserRepository from '../repositories/userrepository';
import {AuthController} from '../dynamic/authcontroller'
import {MetadataController} from '../dynamic/metadataController'
import {repositoryMap} from "./repositories";

export class InitializeControllers {
    constructor() {
        this.initializeController();
    }

    private initializeController() {
       
        for (var path in repositoryMap) {
            var controller = new DynamicController((<any>repositoryMap()[path].fn).path, <any>repositoryMap()[path].repo);
        }
        var authController = new AuthController("/", <any>repositoryMap()['users'].repo);
        authController.createAuthStrategy();
        var metadataController = new MetadataController();
    }
}