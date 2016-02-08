//import * as Utils from "./metadata/utils";
/// <reference path="../node_modules/reflect-metadata/reflect-metadata.d.ts" />
console.log('abc');
function onetomany(params) {
    if (params === void 0) { params = {}; }
    console.log('aa');
    return function (target, key) {
        // property value
        //Utils.addMetaData(<Utils.IMetaTarget>target, "field", Utils.DecoratorType.PROPERTY, null, key);      
        var _val = this[key];
        // property getter
        var getter = function () {
            console.log("Get: " + key + " => " + _val);
            //var Reflect = require('reflect-metadata/Reflect');
            var propTypeName = Reflect(global).Reflect.getMetadata("design:type", this, key);
            var selfLink = {};
            if (_val._id) {
                selfLink["href"] = "/" + propTypeName + "/" + _val._id;
                _val["_links"] = {};
                _val["_links"]["self"] = selfLink;
            }
            return _val;
        };
        // property setter
        var setter = function (newVal) {
            console.log("Set: " + key + " => " + newVal);
            if (!this._links) {
                this._links = {};
            }
            var links = this._links;
            var relLink = {};
            relLink["href"] = "/user/" + this._id + "/" + key;
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
        //console.log('onetomany - propertyKey: ', key, ', target:', target);
    };
}
exports.onetomany = onetomany;
function manytoone(params) {
    if (params === void 0) { params = {}; }
    return function (target, propertyKey) {
        console.log('manytoone - propertyKey: ', propertyKey, ', target:', target);
        Utils.addMetaData(target, "manytoone", Utils.DecoratorType.PROPERTY, params, propertyKey);
    };
}
exports.manytoone = manytoone;
function manytomany() {
    return function (target, propertyKey) {
        console.log('manytomany - propertyKey: ', propertyKey, ', target:', target);
        Utils.addMetaData(target, "manytomany", Utils.DecoratorType.PROPERTY, params, propertyKey);
    };
}
exports.manytomany = manytomany;
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
