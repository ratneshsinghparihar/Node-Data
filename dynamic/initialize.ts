import * as Utils from "../decorators/metadata/utils";
import {InitializeRepositories, mongooseRepoMap} from "./initialize-repositories";
import {InitializeControllers} from "./initialize-controllers";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';

var Mongoose = require("mongoose");
var MongooseSchema = Mongoose.Schema;
var Config = require('../config');

export class Initalize {
    constructor(repositories: Array<Function>) {
        new InitializeRepositories(repositories);
        new InitializeControllers(mongooseRepoMap);
    }
}
