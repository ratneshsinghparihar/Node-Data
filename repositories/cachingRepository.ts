import {repository} from "../core/decorators";
import {DynamicRepository} from "../core/dynamic/dynamic-repository";
import {MetaUtils} from "../core/metadata/utils";
import {MetaData} from '../core/metadata/metadata';
import { entityAction, EntityActionParam } from "../core/decorators/entityAction";
import {inject} from '../di/decorators/inject';
import Q = require('q');
import { PrincipalContext } from '../security/auth/principalContext';
var hash = require('object-hash');

export class CachingRepository extends DynamicRepository {

    public getCacheRepo() {
        return super.getCacheRepo();
    }

    findOne(id: any): Q.Promise<any> {
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

    findWhere(query, selectedFields?: Array<any>, queryOptions?: any): Q.Promise<any> {
        let hashEntity = hash(JSON.stringify(query));
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
        return super.put(id, obj).then(result => {
            this.setEntityIntoCache(CacheConstants.idCache, id, result);
            return result;
        });
    }

    delete(id: any) {
        return super.delete(id).then(result => {
            this.deletEntityFromCache(CacheConstants.idCache, id);
            return result;
        });
    }

    patch(id: any, obj) {
        return super.patch(id, obj).then(result => {
            this.setEntityIntoCache(CacheConstants.idCache, id, result);
            return result;
        });
    }

    bulkPut(objArr: Array<any>) {
        if (!objArr) {
            return undefined;
        }

        return super.bulkPut(objArr).then(results => {
            results.forEach(x => this.setEntityIntoCache(CacheConstants.idCache, x._id, x));
            return results;
        });

    }

    bulkPatch(objArr: Array<any>) {
        if (!objArr) {
            return undefined;
        }

        return super.bulkPatch(objArr).then(results => {
            results.forEach(x => this.setEntityIntoCache(CacheConstants.idCache, x._id, x));
            return results;
        });
    }

    bulkPutMany(objIds: Array<any>, obj: any) {
        if (!objIds) {
            return undefined;
        }

        return super.bulkPutMany(objIds, obj).then(results => {
            results && results.forEach(x => this.setEntityIntoCache(CacheConstants.idCache, x._id, x));
            return results;
        });
    }

    bulkDel(objArr: Array<any>) {
        if (!objArr) {
            return undefined;
        }

        return super.bulkDel(objArr).then(result => {
            objArr.forEach(x => this.deletEntityFromCache(CacheConstants.idCache, x._id));
            return result;
        });
    }

    private getEntityFromCache(param: string, id: any) {
        // entityCache->modelName_path->hashEntity->{key: valueObj}
        //                            ->idEntity->{key: valueObj}
        let currentUser: any = PrincipalContext.User;
        if (currentUser && currentUser.entityCache && currentUser.entityCache[(<any>this).path] &&
            currentUser.entityCache[(<any>this).path][param] && currentUser.entityCache[(<any>this).path][param][id]) {
            return currentUser.entityCache[(<any>this).path][param][id];
        }
        return undefined;
    }

    private setEntityIntoCache(param: string, id: any, value: any) {
        // entityCache->modelName_path->hashEntity->{key: valueObj}
        //                            ->idEntity->{key: valueObj}
        let currentUser: any = PrincipalContext.User;
        if (!currentUser) {
            currentUser = {};
            PrincipalContext.User = currentUser;
        }

        if (!currentUser.entityCache) {
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
export default CachingRepository;

export class CacheConstants {
    public static idCache: string = "idCache";
    public static hashCache: string = "hashCache";
}

