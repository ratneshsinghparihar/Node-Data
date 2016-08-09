import Q = require('q');
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import * as MongooseModel from './mongoose-model';
import {pathRepoMap, getModel} from '../core/dynamic/model-entity';
import {winstonLog} from '../logging/winstonLog';

export class MongooseService implements IEntityService {

    constructor() {
    }

    bulkPost(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkPost(this.getMongooseModel(repoPath), objArr);
    }


    bulkDel(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkDel(this.getMongooseModel(repoPath), objArr);
    }

    bulkPut(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkPut(this.getMongooseModel(repoPath), objArr);
    }

    bulkPutMany(repoPath: string, objIds: Array<any>, obj: any): Q.Promise<any> {
        return MongooseModel.bulkPutMany(this.getMongooseModel(repoPath), objIds, obj);
    }

    findAll(repoPath: string): Q.Promise<any> {
        return MongooseModel.findAll(this.getMongooseModel(repoPath));
    }

    findWhere(repoPath: string, query): Q.Promise<any> {
        return MongooseModel.findWhere(this.getMongooseModel(repoPath), query);
    }

    findOne(repoPath: string, id): Q.Promise<any> {
        return MongooseModel.findOne(this.getMongooseModel(repoPath), id);
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        return MongooseModel.findByField(this.getMongooseModel(repoPath), fieldName, value);
    }

    findMany(repoPath: string, ids: Array<any>) {
        return MongooseModel.findMany(this.getMongooseModel(repoPath), ids);
    }

    findChild(repoPath: string, id, prop): Q.Promise<any> {
        return MongooseModel.findChild(this.getMongooseModel(repoPath), id, prop);
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    post(repoPath: string, obj: any): Q.Promise<any> {
        return MongooseModel.post(this.getMongooseModel(repoPath), obj);
    }

    put(repoPath: string, id: any, obj: any): Q.Promise<any> {
        return MongooseModel.put(this.getMongooseModel(repoPath), id, obj);
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        return MongooseModel.del(this.getMongooseModel(repoPath), id);
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        return MongooseModel.patch(this.getMongooseModel(repoPath), id, obj);
    }

    private getMongooseModel(repoPath: string) {
        try {
            return getModel(pathRepoMap[repoPath].schemaName);
        } catch (e) {
            winstonLog.logError(`Error in getMongooseModel ${e}`);
            throw e;
        }
    }
}