import {Decorators} from '../constants';
import {DecoratorType} from '../enums';

import * as Utils from "./metadata/utils";
import {MetaData} from './metadata/metadata';

export function onetomany(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean, eagerLoading?: boolean}) {
    params = params || <any>{};

    return function (target: Object, key: string) {

        var name = (<any>target.constructor).name;
        console.log('onetomany - propertyKey: ', key, ', target:', name);
        Utils.addMetaData(target, Decorators.ONETOMANY, DecoratorType.PROPERTY, params, key);

        //console.log('onetomany - propertyKey: ', key, ', target:', target);
    }
}

export function manytoone(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean, eagerLoading?: boolean }) {
    params = params || <any>{};

    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('manytoone - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, Decorators.MANYTOONE, DecoratorType.PROPERTY, params, propertyKey);
    }
}

export function manytomany(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean, eagerLoading?: boolean }) {
    params = params || <any>{};

    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('manytomany - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, Decorators.MANYTOMANY, DecoratorType.PROPERTY, params, propertyKey);
    }
}

export function onetoone(params: { biDirectional?: boolean, rel: string, itemType: Object, embedded?: boolean, persist?: boolean, eagerLoading?: boolean }) {
    params = params || <any>{};

    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('onetoone - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, Decorators.ONETOONE, DecoratorType.PROPERTY, params, propertyKey);
    }
}