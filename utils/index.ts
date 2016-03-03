/// <reference path="../typings/mongoose/mongoose.d.ts" />
/// <reference path="../typings/linq/linq.3.0.3-Beta4.d.ts" />

var Enumerable: linqjs.EnumerableStatic = require('linq');
import Mongoose = require("mongoose");
import {ClassType} from './classtype';

export function getDesignType(target: Object|Function, prop: string) {
    return Reflect.getMetadata("design:type", target, prop);
}

export function getDesignParamType(target: Object | Function, prop: string, parameterIndex: number) {
    return Reflect.getMetadata("design:paramtypes", target, prop);
}

export function castToMongooseType(value, schemaType) {
    var newVal;
    switch (schemaType) {
        case Mongoose.Types.ObjectId:
            if (value instanceof Mongoose.Types.ObjectId) {
                newVal = value;
            } else if (typeof value === 'string') {
                newVal = new Mongoose.Types.ObjectId(value);
            } else {
                throw 'cannot cast to primary key type';
            }
            break;
        case String:
            if (typeof value === 'string') {
                newVal = value;
            }
            newVal = value.toString();
            break;
        case Number:
            if (typeof value === 'number') {
                newVal = value;
            }
            newVal = parseInt(value);
            if (isNaN(newVal)) {
                throw 'cannot cast to primary key type';
            }
            break;
        default: newVal = value; break;
    }
    return newVal;
}

export function activator<T>(cls: ClassType, args?: Array<any>): T {
    return new (Function.prototype.bind.apply(cls, [null].concat(args)));
    //function F(): void {
    //    return <any>cls.constructor.apply(this, args);
    //}
    //F.prototype = <any>cls.constructor.prototype;
    //return new F();
}

export function isRelationDecorator(decorator: string) {
    return decorator === 'onetomany' || decorator === 'manytoone' || decorator === 'manytomany';
}