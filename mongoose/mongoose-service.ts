import Q = require('q');
import {IEntityService} from '../core/interfaces/entity-service';
import {MetaUtils} from "../core/metadata/utils";
import * as MongooseModel from './mongoose-model';
import {pathRepoMap, getModel, getEntity} from '../core/dynamic/model-entity';
import {winstonLog} from '../logging/winstonLog';
import * as Utils from './utils';
import {QueryOptions} from '../core/interfaces/queryOptions';
import {BaseModel} from "../models/baseModel";
import * as utils from '../mongoose/utils';
import { PrincipalContext } from '../security/auth/principalContext';
import * as configUtil from '../core/utils';
import {IUser} from '../tests/models/user';
import {getDbSpecifcModel} from './db';
import {Decorators} from '../core/constants';
var hash = require('object-hash');

export class MongooseService implements IEntityService {

    constructor() {
    }
    
    updateWriteCount() {
        if (PrincipalContext) {
            var count = PrincipalContext.get('cacheCount');
            if (!count) {
                count = 0;
            }
            PrincipalContext.save('cacheCount', ++count);
        }

    }

    startTransaction(param?:any):Q.Promise<any>{
        return Q.when(true);
    }

    commitTransaction(param?:any):Q.Promise<any>{
        return Q.when(true);
    }

    rollbackTransaction(param?:any):Q.Promise<any>{
        return Q.when(true);
    }

    bulkPost(repoPath: string, objArr: Array<any>, batchSize?: number): Q.Promise<any> {
        return MongooseModel.bulkPost(this.getModel(repoPath), objArr, batchSize);
    }

    bulkDel(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkDel(this.getModel(repoPath), objArr).then(result => {
            objArr.forEach(x => this.deletEntityFromCache(repoPath, CacheConstants.idCache, x._id));
            return result;
        });
    }

    bulkPut(repoPath: string, objArr: Array<any>, batchSize?: number, donotLoadChilds?: boolean): Q.Promise<any> {
        return MongooseModel.bulkPut(this.getModel(repoPath), objArr, batchSize, donotLoadChilds).then(results => {
            results.forEach((x: BaseModel) => {
                if (donotLoadChilds) {
                    x.__partialLoaded = true;
                }
                this.setEntityIntoCache(repoPath, CacheConstants.idCache, x._id, x)
            });
            return results;
        });
    }

    bulkPatch(repoPath: string, objArr: Array<any>): Q.Promise<any> {
        return MongooseModel.bulkPatch(this.getModel(repoPath), objArr).then(results => {
            results.forEach(x => this.setEntityIntoCache(repoPath, CacheConstants.idCache, x._id, x));
            return results;
        });
    }

    bulkPutMany(repoPath: string, objIds: Array<any>, obj: any): Q.Promise<any> {
        return MongooseModel.bulkPutMany(this.getModel(repoPath), objIds, obj).then(results => {
            //results && results.forEach((x: BaseModel) => {
            //    // in bulkPutMany we do not load egarLoading properties (children objects) so its partially loaded
            //    x.__partialLoaded = true;
            //    this.setEntityIntoCache(repoPath, CacheConstants.idCache, x._id, x);
            //});
            return results;
        });
    }

    findAll(repoPath: string): Q.Promise<any> {
        return MongooseModel.findAll(this.getModel(repoPath));
    }

    findWhere(repoPath: string, query, selectedFields?: Array<string> | any, queryOptions?: QueryOptions, toLoadChilds?: boolean): Q.Promise<any> {
        let hashEntity = hash(JSON.stringify(query));
        let cacheValueIds: Array<any> = this.getEntityFromCache(repoPath, CacheConstants.hashCache, hashEntity);
        if (cacheValueIds) {
            // get objects from cache only if previous findwhere does not cached with selectedFields
            let cachedValueResults = cacheValueIds.map(id => this.getEntityFromCache(repoPath, CacheConstants.idCache, id))
                .filter((x: BaseModel) => x && !x.__selectedFindWhere && !x.__partialLoaded);
            if (cacheValueIds.length === cachedValueResults.length) {
                console.log("cache hit success findWhere " + repoPath + " count " + cachedValueResults.length);
                this.updateWriteCount();
                return Q.when(cachedValueResults);
            }
        }

        return MongooseModel.findWhere(this.getModel(repoPath), query, selectedFields, queryOptions, toLoadChilds).then((results: Array<BaseModel>) => {
            results.forEach(result => {
                if (selectedFields && selectedFields.length > 0) {
                    result.__selectedFindWhere = true;
                }
                // if selected fields is empty or undefined and toLoadChilds is false, then set partialLoaded true
                if ((!selectedFields || selectedFields.length === 0) && toLoadChilds === false) {
                    result.__partialLoaded = true;
                }
                this.setEntityIntoCache(repoPath, CacheConstants.idCache, result._id, result);

            });
            this.setEntityIntoCache(repoPath, CacheConstants.hashCache, hashEntity, results.map(x => x._id));
            return results;
        });
    }

    countWhere(repoPath: string, query): Q.Promise<any> {
        return MongooseModel.countWhere(this.getModel(repoPath), query);
    }

    distinctWhere(repoPath: string, query): Q.Promise<any> {
        return MongooseModel.countWhere(this.getModel(repoPath), query);
    }

    findOne(repoPath: string, id, donotLoadChilds?: boolean): Q.Promise<any> {
        let cacheValue: BaseModel = this.getEntityFromCache(repoPath, CacheConstants.idCache, id);
        if (cacheValue && !cacheValue.__partialLoaded && !cacheValue.__selectedFindWhere) {
            console.log("cache hit success findone " + repoPath);
            this.updateWriteCount();
            return Q.when(cacheValue);
        }
        return MongooseModel.findOne(this.getModel(repoPath), id, donotLoadChilds).then((result: BaseModel) => {
            if (donotLoadChilds) {
                result.__partialLoaded = true;
            }
            this.setEntityIntoCache(repoPath, CacheConstants.idCache, id, result);
            return result;
        });
    }

    findByField(repoPath: string, fieldName, value): Q.Promise<any> {
        return MongooseModel.findByField(this.getModel(repoPath), fieldName, value);
    }

    findMany(repoPath: string, ids: Array<any>, toLoadEmbeddedChilds?: boolean) {
        // do not cache embedded objects
        if (!utils.isBasonOrStringType(ids[0])) {
            return Q.when(ids);
        }

        let chachedValues = [];
        let unChachedIds = [];
        ids.forEach(id => {
            let cacheValue: BaseModel = this.getEntityFromCache(repoPath, CacheConstants.idCache, id);
            if (cacheValue) {
                if (cacheValue.__selectedFindWhere) {
                    unChachedIds.push(id);
                    return;
                }
                if (toLoadEmbeddedChilds && cacheValue.__partialLoaded) {
                    unChachedIds.push(id);
                    return;
                }
                return chachedValues.push(cacheValue);
            }
            unChachedIds.push(id);
        });

        if (unChachedIds.length === 0) {
            return Q.when(chachedValues);
        }
        
        if (chachedValues && chachedValues.length) {
            console.log("cache hit success findMany " + repoPath + " count " + chachedValues.length);
            this.updateWriteCount();
        }
        
        return MongooseModel.findMany(this.getModel(repoPath), unChachedIds, toLoadEmbeddedChilds).then((results: Array<BaseModel>) => {
            results.forEach(result => {
                if (!toLoadEmbeddedChilds) {
                    result.__partialLoaded = true;
                }
                this.setEntityIntoCache(repoPath, CacheConstants.idCache, result._id, result);
            });
            return chachedValues.concat(results);
        });
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
        return MongooseModel.put(this.getModel(repoPath), id, obj).then(result => {
            this.setEntityIntoCache(repoPath, CacheConstants.idCache, id, result);
            return result;
        });
    }

    del(repoPath: string, id: any): Q.Promise<any> {
        return MongooseModel.del(this.getModel(repoPath), id).then(result => {
            this.deletEntityFromCache(repoPath, CacheConstants.idCache, id);
            return result;
        });
    }

    patch(repoPath: string, id: any, obj): Q.Promise<any> {
        return MongooseModel.patch(this.getModel(repoPath), id, obj).then(result => {
            this.setEntityIntoCache(repoPath, CacheConstants.idCache, id, result);
            return result;
        });
    }

    getModel(repoPath: string, dynamicName?: string) {
        try {
            let model = Utils.getCurrentDBModel(pathRepoMap[repoPath].schemaName);
            if (model && dynamicName) {
                var meta = MetaUtils.getMetaData(getEntity(model.modelName), Decorators.DOCUMENT);
                if (meta && meta[0] && meta[0].params.dynamicName) {
                    model = getDbSpecifcModel(dynamicName, model.schema);
                }
            }
            return model;
        } catch (e) {
            winstonLog.logError(`Error in getMongooseModel ${e}`);
            throw e;
        }
    }

    getSortCondition(val){
        return val;
    }

    getLikeCondition(val){
        return {
            $regex: '.*' + val + '.*'
        }
    }

    getStartsWithCondition(val){
        return {
            $regex: '^' + val + '.*'
        }
    }

    private getEntityFromCache(repoPath: string, param: string, id: any) {
        // entityCache->modelName_path->hashEntity->{key: valueObj}
        //                            ->idEntity->{key: valueObj}
        if (!configUtil.config().Config.isCacheEnabled) {
            return undefined;
        }
        let currentUser: IUser = PrincipalContext.User;
        if (currentUser && currentUser.entityCache && currentUser.entityCache[repoPath] &&
            currentUser.entityCache[repoPath][param] && currentUser.entityCache[repoPath][param][id]) {

            // if current context view is changed then clear cache objects
            if (currentUser.cacheContext != currentUser.viewContext) {
                currentUser.cacheContext = currentUser.viewContext;
                currentUser.entityCache = [];
                return undefined;
            }
            return currentUser.entityCache[repoPath][param][id];
        }
        return undefined;
    }

    private setEntityIntoCache(repoPath: string, entityType: string, id: any, value: any) {
        // entityCache->modelName_path->hashEntity->{key: valueObj}
        //                            ->idEntity->{key: valueObj}
        if (!configUtil.config().Config.isCacheEnabled) {
            return undefined;
        }
        let currentUser: IUser = PrincipalContext.User;
        if (!currentUser) {
            currentUser = <any>{};
            PrincipalContext.User = currentUser;
        }

        if (!currentUser.entityCache) {
            currentUser.entityCache = {};
        }

        if (!currentUser.entityCache[repoPath]) {
            currentUser.entityCache[repoPath] = {};
        }

        if (!currentUser.entityCache[repoPath][entityType]) {
            currentUser.entityCache[repoPath][entityType] = {};
        }

        currentUser.entityCache[repoPath][entityType][id] = value;
    }

    private deletEntityFromCache(repoPath: string, param: string, id: any) {
        if (!configUtil.config().Config.isCacheEnabled) {
            return undefined;
        }
        let currentUser: any = PrincipalContext.User;
        if (currentUser && currentUser.entityCache && currentUser.entityCache[repoPath] &&
            currentUser.entityCache[repoPath][param][id]) {
            delete currentUser.entityCache[repoPath][param][id];
        }
    }

    getPrimaryKey(repoPath){
        return '_id';
    }
}

export class CacheConstants {
    public static idCache: string = "idCache";
    public static hashCache: string = "hashCache";
}
