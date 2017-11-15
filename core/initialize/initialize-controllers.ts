import {DynamicController} from '../dynamic/dynamic-controller';
import {AuthController} from '../../security/auth/authcontroller';
import {MetadataController} from '../api/metadataController';
import {repositoryMap} from "../exports/repositories";
import {MetaData} from '../metadata/metadata';
import {ExportTypes} from '../constants/decorators';

export class InitializeControllers {
    constructor() {
        this.initializeController();
    }

    private initializeController() {
       
        for (var path in repositoryMap()) {
            let repo = <any>repositoryMap()[path].repo;
            let meta: MetaData = repo.getMetaData();
            if (meta && (meta.params.exportType == ExportTypes.ALL || meta.params.exportType == ExportTypes.REST)) {
                var controller = new DynamicController(<any>repositoryMap()[path].fn, repo);
            }
        }
        var authController = new AuthController("/");
        var metadataController = new MetadataController();
    }
}