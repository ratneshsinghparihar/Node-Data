import Q = require('q');

export interface IEntityService {
    findAll(model: any): Q.Promise<any>;
    findWhere(model: any, query): Q.Promise<any>;
    findOne(model: any, id);
    findByField(model: any, fieldName, value): Q.Promise<any>;
    findMany(model: any, ids: Array<any>);
    findChild(model: any, id, prop);
    bulkPost(model: any, objArr: Array<any>): Q.Promise<any>;
    bulkPut(model: any, objArr: Array<any>): Q.Promise<any>;
    post(model: any, obj: any): Q.Promise<any>;
    put(model: any, id: any, obj: any): Q.Promise<any>;
    del(model: any, id: any): Q.Promise<any>;
    patch(model: any, id: any, obj): Q.Promise<any>;
}