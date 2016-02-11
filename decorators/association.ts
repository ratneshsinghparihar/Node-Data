import {ModelBase} from '../models/modelBase.ts';
import * as Utils from "./metadata/utils";
/// <reference path="../node_modules/reflect-metadata/reflect-metadata.d.ts" />
console.log('abc');
export function onetomany(params: { biDirectional: boolean, rel: string, itemType: Object, embedded: boolean, level?: number } = <any>{}) {

    console.log('aa');
    return function (target:Object, key:string) {

        // property value

        //Utils.addMetaData(<Utils.IMetaTarget>target, "onetomany", Utils.DecoratorType.PROPERTY, null, key);

        var _val = this[key];


        // property getter
        var getter = function () {
            console.log(`Get: ${key} => ${_val}`);
            //var Reflect = require('reflect-metadata/Reflect');
            var metaData: Utils.MetaData = Utils.getMetaDataForField(target, key);
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
        Utils.addMetaData(target, "onetomany", Utils.DecoratorType.PROPERTY, params, key);

        //console.log('onetomany - propertyKey: ', key, ', target:', target);
    }
}

export function manytoone(params:{rel: string} = <any>{}) {
    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('manytoone - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, "manytoone", Utils.DecoratorType.PROPERTY, params, propertyKey);
    }
}

export function manytomany(params:{rel: string} = <any>{}) {
    return function (target: Object, propertyKey: string) {
        var name = (<any>target.constructor).name;
        console.log('manytomany - propertyKey: ', propertyKey, ', target:', name);
        Utils.addMetaData(target, "manytomany", Utils.DecoratorType.PROPERTY, params, propertyKey);
    }
}

// export function manytoone(){
//     return function(target: Function, propertyKey: string, descriptor: TypedPropertyDescriptor<any>){
//         var originalMethod = descriptor.value;
//         console.log('manytoone - on method: ' + propertyKey);
//         
//          descriptor.value = function(...args: any[]) {
//             console.log("The method args are: " + JSON.stringify(args)); // pre
//             var result = originalMethod.apply(this, args);               // run and store the result
//             console.log("The return value is: " + result);               // post
//             return result;                                               // return the result of the original method
//         }
//         return descriptor;
//     }
// }
// 
// export function manytomany(){
//     return function(target: Function, propertyKey: string, descriptor: TypedPropertyDescriptor<any>){
//         var originalMethod = descriptor.value;
//         console.log('manytomany - on method: ' + propertyKey);
//         
//          descriptor.value = function(...args: any[]) {
//             console.log("The method args are: " + JSON.stringify(args)); // pre
//             var result = originalMethod.apply(this, args);               // run and store the result
//             console.log("The return value is: " + result);               // post
//             return result;                                               // return the result of the original method
//         };
//     }
// }