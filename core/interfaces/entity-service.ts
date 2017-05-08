import Q = require('q');
import {QueryOptions} from '../interfaces/queryOptions';

export interface IEntityService {
    findAll(model: any): Q.Promise<any>;
    findWhere(model: any, query, selectedFields?: Array<string>, queryOptions?: QueryOptions, toLoadChilds?: boolean): Q.Promise<any>;
    findOne(model: any, id);
    findByField(model: any, fieldName, value): Q.Promise<any>;
    findMany(model: any, ids: Array<any>,toLoadEmbeddedChilds?:boolean);
    findChild(model: any, id, prop);
    bulkPost(model: any, objArr: Array<any>): Q.Promise<any>;
    bulkPut(model: any, objArr: Array<any>): Q.Promise<any>;
    bulkPatch(model: any, objArr: Array<any>): Q.Promise<any>;
    bulkPutMany(model: any, objIds: Array<any>, obj: any): Q.Promise<any>;
    bulkDel(model: any, objArr: Array<any>): Q.Promise<any>;
    post(model: any, obj: any): Q.Promise<any>;
    put(model: any, id: any, obj: any): Q.Promise<any>;
    del(model: any, id: any): Q.Promise<any>;
    patch(model: any, id: any, obj): Q.Promise<any>;
    getModel(repoPath: string);
}