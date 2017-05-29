import Q = require('q');
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import * as MongooseModel from './mongoose-model';
import {pathRepoMap, getModel} from '../core/dynamic/model-entity';
import {winstonLog} from '../logging/winstonLog';
import * as Utils from './utils';
import {QueryOptions} from '../core/interfaces/queryOptions';

export class MongooseService implements IEntityService {

    constructor() {
    }

    bulkPost(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkPost(this.getModel(repoPath), objArr);
    }


    bulkDel(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkDel(this.getModel(repoPath), objArr);
    }

    bulkPut(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkPut(this.getModel(repoPath), objArr);
    }

    bulkPatch(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkPatch(this.getModel(repoPath), objArr);
    }

    bulkPutMany(repoPath: string, objIds: Array<any>, obj: any): Q.Promise<any> {
        return MongooseModel.bulkPutMany(this.getModel(repoPath), objIds, obj);
    }

    findAll(repoPath: string): Q.Promise<any> {
        return MongooseModel.findAll(this.getModel(repoPath));
    }

    findWhere(repoPath: string, query, selectedFields?: Array<string> | any, queryOptions?: QueryOptions, toLoadChilds?: boolean): Q.Promise<any> {
        return MongooseModel.findWhere(this.getModel(repoPath), query, selectedFields, queryOptions, toLoadChilds);
    }

    countWhere(repoPath: string, query): Q.Promise<any> {
        return MongooseModel.countWhere(this.getModel(repoPath), query);
    }

    distinctWhere(repoPath: string, query): Q.Promise<any> {
        return MongooseModel.countWhere(this.getModel(repoPath), query);
    }

    findOne(repoPath: string, id): Q.Promise<any> {
        return MongooseModel.findOne(this.getModel(repoPath), id);
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        return MongooseModel.findByField(this.getModel(repoPath), fieldName, value);
    }

    findMany(repoPath: string, ids: Array<any>,toLoadEmbeddedChilds?: boolean) {
        return MongooseModel.findMany(this.getModel(repoPath), ids,toLoadEmbeddedChilds);
    }

    findChild(repoPath: string, id, prop): Q.Promise<any> {
        return MongooseModel.findChild(this.getModel(repoPath), id, prop);
    }

    /**
     * case 1: all new - create main item and child separately and embed if true
     * case 2: some new, some update - create main item and update/create child accordingly and embed if true
     * @param obj
     */
    post(repoPath: string, obj: any): Q.Promise<any> {
        return MongooseModel.post(this.getModel(repoPath), obj);
    }

    put(repoPath: string, id: any, obj: any): Q.Promise<any> {
        return MongooseModel.put(this.getModel(repoPath), id, obj,repoPath);
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        return MongooseModel.del(this.getModel(repoPath), id);
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        return MongooseModel.patch(this.getModel(repoPath), id, obj,repoPath);
    }

    getModel(repoPath: string) {
        try {
            return Utils.getCurrentDBModel(pathRepoMap[repoPath].schemaName);
        } catch (e) {
            winstonLog.logError(`Error in getMongooseModel ${e}`);
            throw e;
        }
    }
}