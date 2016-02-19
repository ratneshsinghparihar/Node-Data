import {ModelBase} from '../models/modelBase.ts';
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

import * as Utils from "./metadata/utils";
import {MetaData} from './metadata/metadata';

/// <reference path="../node_modules/reflect-metadata/reflect-metadata.d.ts" />
console.log('abc');
export function onetomany(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean } = <any>{}) {

    console.log('aa');
    return function (target:Object, key:string) {
        var _val = this[key];
        // property getter
        var getter = function () {
            console.log(`Get: ${key} => ${_val}`);
            //var Reflect = require('reflect-metadata/Reflect');
            var metaData: MetaData = Utils.getMetaDataForField(target, key);
            var propTypeName = metaData.propertyType.rel;
            var selfLink = {};
            if ((<ModelBase>_val)._id) {
                selfLink["href"] = "/" + propTypeName + "/" + (<ModelBase>_val)._id;
                _val["_links"] = {};
                _val["_links"]["self"] = selfLink;
            }
             return _val;
        };

        // property setter
        var setter = function (newVal) {
            console.log(`Set: ${key} => ${newVal}`);
            if (!(<ModelBase>this)._links) {
                (<ModelBase>this)._links = <any>{};
            }
            var links = newVal;
            var links = (<ModelBase>this)._links;
            var relLink = {};
            relLink["href"] = "/user/" + (<ModelBase>this)._id + "/" + key;

            links[key] = relLink;
            this["_links"] = links;
            _val = newVal;
        };

        // Delete property.
        if (delete this[key]) {

            // Create new property with getter and setter
            Object.defineProperty(target, key, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });
        }

        var name = (<any>target.constructor).name;
        console.log('onetomany - propertyKey: ', key, ', target:', name);
        Utils.addMetaData(target, Decorators.ONETOMANY, DecoratorType.PROPERTY, params, key);

        //console.log('onetomany - propertyKey: ', key, ', target:', target);
    }
}

export function manytoone(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean } = <any>{}) {
    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('manytoone - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, Decorators.MANYTOONE, DecoratorType.PROPERTY, params, propertyKey);
    }
}

export function manytomany(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean } = <any>{}) {
    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('manytomany - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, Decorators.MANYTOMANY, DecoratorType.PROPERTY, params, propertyKey);
    }
}