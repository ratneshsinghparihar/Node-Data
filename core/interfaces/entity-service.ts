import Q = require('q');
import {EntityChange} from '../enums/entity-change';
import {MetaData} from '../metadata/metadata';

export interface IEntityService {
    saveObjs(model: any, objArr: Array<any>): Q.Promise<any>;
    findAll(model: any): Q.Promise<any>;
    findWhere(model: any, query): Q.Promise<any>;
    findOne(model: any, id);
    findByField(model: any, fieldName, value): Q.Promise<any>;
    findMany(model: any, ids: Array<any>);
    findChild(model: any, id, prop);
    post(model: any, obj: any): Q.Promise<any>;
    put(model: any, id: any, obj: any): Q.Promise<any>;
    del(model: any, id: any): Q.Promise<any>;
    patch(model: any, id: any, obj): Q.Promise<any>;
    patchAllEmbedded(model: any, prop: string, updateObj: any, entityChange: EntityChange, isEmbedded: boolean, isArray?: boolean): Q.Promise<any>;
    castAndGetPrimaryKeys(obj, prop, relMetaData: MetaData): Array<any>;
    toObject(result): any;
}