import {repository} from "nodedata/core/decorators";
import {DynamicRepository} from "nodedata/core/dynamic/dynamic-repository";
import {MetaUtils} from "nodedata/core/metadata/utils";
import {MetaData} from 'nodedata/core/metadata/metadata';
import { entityAction, EntityActionParam } from "nodedata/core/decorators/entityAction";
import {inject} from 'nodedata/di/decorators/inject';
import Q = require('q');
//import { logger } from "../logging";
import * as Enumerable from 'linq';
import { PrincipalContext } from 'nodedata/security/auth/principalContext';
var hash = require('object-hash');

export class CachingRepository extends DynamicRepository {

    private _cacheRepo: CachingRepository;

    setCacheRepo() {
        this._cacheRepo = this;
    }

    public getRootRepo() {
        return this._cacheRepo;
    }

    findOne(id, donotLoadChilds?: boolean): Q.Promise<any> {
        let cacheValue = this.getEntityFromCache(CacheConstants.idCache, id);
        if (cacheValue) {
            return Q.when(cacheValue);
        }
        return super.findOne(id).then(result => {
            this.setEntityIntoCache(CacheConstants.idCache, id, result);
            return result;
        });
    }

    findMany(ids: Array<any>, toLoadEmbeddedChilds?: boolean): Q.Promise<any> {
        if (!ids) {
            return Q.when(undefined);
        }

        let chachedValues = [];
        let unChachedIds = [];
        ids.forEach(id => {
            let cacheValue = this.getEntityFromCache(CacheConstants.idCache, id);
            if (cacheValue) {
                return chachedValues.push(cacheValue);
            }
            unChachedIds.push(id);
        });

        if (unChachedIds.length === 0) {
            return Q.when(chachedValues);
        }

        return super.findMany(unChachedIds, toLoadEmbeddedChilds).then((results: Array<any>) => {
            results.forEach(result => {
                this.setEntityIntoCache(CacheConstants.idCache, result._id, result);
            });
            return chachedValues.concat(results);
        });

    }

    findAll(): Q.Promise<any> {
        return super.findAll();
    }

    //findWhere(query, selectedFields?: Array<any>): Q.Promise<any>;
    findWhere(query, selectedFields?: Array<any>, queryOptions?: any): Q.Promise<any> {
        let hashEntity = hash(query);
        let cacheValueIds: Array<any> = this.getEntityFromCache(CacheConstants.hashCache, hashEntity);
        if (cacheValueIds) {
            let cachedValueResults = cacheValueIds.map(id => this.getEntityFromCache(CacheConstants.idCache, id)).filter(x => x);
            return Q.when(cachedValueResults);
        }
        return super.findWhere(query, selectedFields, queryOptions).then((results: Array<any>) => {
            results.forEach(result => {
                this.setEntityIntoCache(CacheConstants.idCache, result._id, result);

            });
            this.setEntityIntoCache(CacheConstants.hashCache, hashEntity, results.map(x => x._id));
            return results;
        });
    }


    put(id: any, obj: any): Q.Promise<any> {
        this.deletEntityFromCache(CacheConstants.idCache, id);
        return super.put(id, obj);
    }

    delete(id: any) {
        this.deletEntityFromCache(CacheConstants.idCache, id);
        return super.delete(id);
    }

    patch(id: any, obj) {
        this.deletEntityFromCache(CacheConstants.idCache, id);
        return super.patch(id, obj);
    }

    bulkPut(objArr: Array<any>) {
        if (!objArr) {
            return undefined;
        }

        objArr.forEach(x => this.deletEntityFromCache(CacheConstants.idCache, x._id));
        return super.bulkPut(objArr);

    }

    bulkPatch(objArr: Array<any>) {
        if (!objArr) {
            return undefined;
        }

        objArr.forEach(x => this.deletEntityFromCache(CacheConstants.idCache, x._id));
        return super.bulkPatch(objArr);
    }

    bulkPutMany(objIds: Array<any>, obj: any) {
        if (!objIds) {
            return undefined;
        }

        objIds.forEach(id => this.deletEntityFromCache(CacheConstants.idCache, id));
        return super.bulkPutMany(objIds, obj);
    }

    bulkDel(objArr: Array<any>) {
        if (!objArr) {
            return undefined;
        }

        objArr.forEach(x => this.deletEntityFromCache(CacheConstants.idCache, x._id));
        return super.bulkDel(objArr);
    }

    private getEntityFromCache(param: string, id: any) {
        // entityCache->modelName_path->hashEntity->{key: valueObj}
        //                            ->idEntity->{key: valueObj}
        let currentUser: any = PrincipalContext.User;
        if (currentUser && currentUser.entityCache && currentUser.entityCache[(<any>this).path] &&
            currentUser.entityCache[(<any>this).path][param][id]) {
            return currentUser.entityCache[(<any>this).path][param][id];
        }
        return undefined;
    }

    private setEntityIntoCache(param: string, id: any, value: any) {
        // entityCache->modelName_path->hashEntity->{key: valueObj}
        //                            ->idEntity->{key: valueObj}
        let currentUser: any = PrincipalContext.User;
        if (!currentUser && currentUser.entityCache) {
            currentUser.entityCache = {};
        }

        if (!currentUser.entityCache[(<any>this).path]) {
            currentUser.entityCache[(<any>this).path] = {};
        }

        if (!currentUser.entityCache[(<any>this).path][param]) {
            currentUser.entityCache[(<any>this).path][param] = {};
        }

        currentUser.entityCache[(<any>this).path][param][id] = value;
    }

    private deletEntityFromCache(param: string, id: any) {
        let currentUser: any = PrincipalContext.User;
        if (currentUser && currentUser.entityCache && currentUser.entityCache[(<any>this).path] &&
            currentUser.entityCache[(<any>this).path][param][id]) {
            delete currentUser.entityCache[(<any>this).path][param][id];
        }
    }

}

class CacheConstants {
    public static idCache: string;
    public static hashCache: string;
}

export default CachingRepository;