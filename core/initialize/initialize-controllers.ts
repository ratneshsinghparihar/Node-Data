import {DynamicController} from '../dynamic/dynamic-controller';
import {AuthController} from '../../security/auth/authcontroller';
import {MetadataController} from '../api/metadataController';
import {repositoryMap} from "../exports/repositories";

export class InitializeControllers {
    constructor() {
        this.initializeController();
    }

    private initializeController() {
       
        for (var path in repositoryMap()) {
            var controller = new DynamicController(<any>repositoryMap()[path].fn, <any>repositoryMap()[path].repo);
        }
        var authController = new AuthController("/");
        var metadataController = new MetadataController();
    }
}