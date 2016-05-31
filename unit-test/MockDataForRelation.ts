require('reflect-metadata/reflect');
import {MetaUtils} from '../core/metadata/utils';
import {Decorators} from '../core/constants';
import {DecoratorType} from '../core/enums/decorator-type';
import * as Utils from "../mongoose/utils";
import * as modeEntity from '../core/dynamic/model-entity';
import {Strict} from '../mongoose/enums/';
import Mongoose = require("mongoose");
import {course} from './models/course';
import {student} from './models/student';
var Enumerable: linqjs.EnumerableStatic = require('linq');
var Q = require('q');

var database: { [key: string]: Array<any> } = <any>{};
var _mongooseModel: { [key: string]: any } = <any>{};
var _databaseCalls: { [key: string]: any } = <any>{};

class ModelNames {
    public static course: string = course.prototype.constructor.name;
    public static student: string = student.prototype.constructor.name;
}

class courseRepository{

    find(param: any): Q.Promise<any> {
        return MongoDbMock.find(param, database[ModelNames.course]);
    }

    findOne(param: any): Q.Promise<any> {
        return MongoDbMock.findOne(param, database[ModelNames.course]);
    }

    create(object: any): Q.Promise<any> {
        return MongoDbMock.create(object, _mongooseModel[ModelNames.course], database[ModelNames.course]);
    }

    findOneAndRemove(query: any): Q.Promise<any> {
        return MongoDbMock.findOneAndRemove(query, database[ModelNames.course]);
    }

    findOneAndUpdate(query: any, object: any, param: any): Q.Promise<any> {
        return MongoDbMock.findOneAndUpdate(query, object, param, database[ModelNames.course]);
    }

    update(query: any, object: any, param: any): Q.Promise<any> {
        return MongoDbMock.update(query, object, param, database[ModelNames.course]);
    }
}

class studentRepository{
    find(param: any): Q.Promise<any> {
        return MongoDbMock.find(param, database[ModelNames.student]);
    }

    findOne(param: any): Q.Promise<any> {
        return MongoDbMock.findOne(param, database[ModelNames.student]);
    }

    create(object: any): Q.Promise<any> {
        return MongoDbMock.create(object, _mongooseModel[ModelNames.student], database[ModelNames.student]);
    }

    findOneAndRemove(query: any): Q.Promise<any> {
        return MongoDbMock.findOneAndRemove(query, database[ModelNames.student]);
    }

    findOneAndUpdate(query: any, object: any, param: any): Q.Promise<any> {
        return MongoDbMock.findOneAndUpdate(query, object, param, database[ModelNames.student]);
    }

    update(query: any, object: any, param: any): Q.Promise<any> {
        return MongoDbMock.update(query, object, param, database[ModelNames.student]);
    }
}

export class MongoDbMock {

    static setEmptytoObject(obj: any) {
        if (obj == undefined || obj != {}) {
            obj['toObject'] = function () {
                return {};
            }
        }
    }

    public static find(param: any, collection: Array<any>): Q.Promise<any> {
        var res = [];
        if (JSON.stringify(param) === JSON.stringify({})) {
            res = collection;
        }
        else {
            var prop;
            for (var p in param) {
                prop = p;
                break;
            }
            if (prop == '_id') {
                if (param[prop]['$in']) {
                    var arr: Array<any> = param[prop]['$in'];
                    res = Enumerable.from(collection).where(x => arr.find(id => x['_id'] == id.toString())).toArray();
                }
                else {
                    res = Enumerable.from(collection).where(x => x['_doc'][prop] == param[prop].toString()).firstOrDefault();
                }
            }
            else {
                var arr: Array<any> = param[prop]['$in'];
                if (arr) {
                    Enumerable.from(collection).forEach(x => {
                        if (x['_doc'][prop]) {
                            var f = x['_doc'][prop].find(x => arr.find(id => x.toString() == id));
                            if (f) {
                                res.push(x);
                            }
                        }
                    });
                }
                else {
                    res = Enumerable.from(collection).where(x => x['_doc'][prop] == param[prop].toString()).firstOrDefault();
                }
            }
        }
        //console.log('find (', param, ') => ', res);
        return Q.when(res);
    }

    public static findOne(param: any, collection: Array<any>): Q.Promise<any> {
        var res = {};
        for (var item in param) {
            var id = param[item].toString();
            res = Enumerable.from(collection).where(x => x['_doc'][item] == param[item].toString()).firstOrDefault();
            break;
        }
        //console.log('findOne (', param, ') => ', res);
        return Q.when(res);
    }

    public static create(object: any, model: any, collection: Array<any>): Q.Promise<any> {
        var res;
        if (object instanceof Array) {
            res = [];
            Enumerable.from(object).forEach(x => {
                var obj = new model(x);
                collection.push(obj);
                res.push(obj);
            });
        }
        else {
            var obj = new model(object);
            collection.push(obj);
            res = obj;
        }
        //console.log('create(', object, ')=> ', obj);
        return Q.when(res);
    }

    public static findOneAndRemove(query: any, collection: Array<any>): Q.Promise<any> {
        var res = {};
        for (var item in query) {
            res = Enumerable.from(collection).where(x => x['_doc'][item] == query[item].toString()).firstOrDefault();
            if (res) {
                collection.splice(collection.indexOf(res), 1);
            }
            break;
        }
        //console.log('findOneAndRemove (', query, ') => ', res);
        return Q.when(res);
    }

    public static findOneAndUpdate(query: any, object: any, param: any, collection: Array<any>): Q.Promise<any> {
        var res = {};
        for (var item in query) {
            res = Enumerable.from(collection).where(x => x['_doc'][item] == query[item].toString()).firstOrDefault();
            if (res) {
                var setObject, unsetObject, pushObject;
                if (object['$set']) {
                    setObject = object['$set'];
                }
                if (object['$unset']) {
                    unsetObject = object['$unset'];
                }
                if (object['$push']) {
                    pushObject = object['$push'];
                }
                for (var prop in setObject) {
                    res['_doc'][prop] = setObject[prop];
                }
                for (var prop in unsetObject) {
                    delete res['_doc'][prop];
                }
                for (var prop in pushObject) {
                    var vals = pushObject[prop]['$each'];
                    if (!res['_doc'][prop]) {
                        res['_doc'][prop] = [];
                    }
                    Enumerable.from(vals).forEach(x => res['_doc'][prop].push(x));
                }
            }
            break;
        }
        //console.log('findOneAndUpdate (', query, object, param, ') => ', res);
        return Q.when(res);
    }

    public static update(query: any, object: any, param: any, collection: Array<any>): Q.Promise<any> {
        var res = [];
        if (JSON.stringify(query) === JSON.stringify(MongoDbMock.updateCondition) ||
            (JSON.stringify(query) === JSON.stringify({}) &&
             JSON.stringify(object) === JSON.stringify(MongoDbMock.updateCondition))) {

            var id = MongoDbMock.updateResult['_id'].toString();
            res = collection.find(x => x['_id'] == id);
            for (var ind in MongoDbMock.updateResult) {
                res['_doc'][ind] = MongoDbMock.updateResult[ind];
            }
            res = [res];
            //console.log('condition matched', res, id);
        }
        //console.log('update (', query, object, param), ') =>', res);
        return Q.when(res);
    }

    private static updateCondition;
    private static updateResult;
    public static setOnUpdate(model: any, cond: any, object: any) {
        //console.log('setOnUpdate - ', cond, object);
        MongoDbMock.updateCondition = cond;
        MongoDbMock.updateResult = object;
    }
}

export function AddAllFakeFunctions() {
    database[ModelNames.course] = [];
    _mongooseModel[ModelNames.course] = Mongoose.model(ModelNames.course, new Mongoose.Schema(course.prototype.schema()));
    _databaseCalls[ModelNames.course] = new courseRepository();

    database[ModelNames.student] = [];
    _mongooseModel[ModelNames.student] = Mongoose.model(ModelNames.student, new Mongoose.Schema(student.prototype.schema()));
    _databaseCalls[ModelNames.student] = new studentRepository();

    console.log('added all faked function');
}

export function createMongooseModel(name: Function, object: any): Mongoose.Model<any> {
    object['_id'] = new Mongoose.Types.ObjectId();
    var model = new _mongooseModel[name.prototype.constructor.name](object);
    database[name.prototype.constructor.name].push(model);
    return model;
}

export function getMongooseModel(name: Function): Mongoose.Model<any> {
    return _mongooseModel[name.prototype.constructor.name];
}

export function getFakeFunctionForMongoose(func, model): any {
    var fn: Function = func as Function;
    var res = _databaseCalls[model.modelName][func.name];
    if (!res) {
        //console.log('return fake function - ', model.modelName, fn.length, fn.arguments, fn);
        if (fn.length == 4) {
            return _databaseCalls[model.modelName]['findOneAndUpdate'];
        }
        else if (fn.length == 3) {
            return _databaseCalls[model.modelName]['findOneAndRemove'];
        }
    }
    return res;
}

export function clearDatabase() {
    database[ModelNames.course] = [];
    database[ModelNames.student] = [];
}

export class mockedFunctions {

    castToMongooseType(value, schemaType) {
        //console.log('castToMongooseType - ', value, schemaType);
        if (value['_id']) {
            return value['_id'];
        }
        else {
            return value;
        }
    }

    getEntity(object: any) {
        //console.log('getEntity - ', object);

        switch (object) {
            case ModelNames.course:
                return course;
            case ModelNames.student:
                return student;
        }
    }

    getModel(object: any) {
        //console.log('getModel - ', object);
        return _mongooseModel[object];
    }

    //getMetaData(entity: any, decprator: any) {
    //}

    //getMetaDataForPropKey(entity: any, prop: any) {
    //}

    //getAllRelationsForTargetInternal(entity: any) {
    //}

    //getAllRelationsForTarget(entity: any) {
    //}

    //isRelationDecorator(decorator: any) {
    //}

    //getPrimaryKeyMetadata(entity: any) {
    //}
}
