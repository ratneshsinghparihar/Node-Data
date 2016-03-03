import * as dynamic from '../dynamic/dynamic';
import * as Utils from "./metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {Strict} from '../enums/document-strict';

//export function repository(path: string, model: Function) {
    export function repository(params: { path: string, model: any} = <any>{}) {

    return function (target: Function) {
        console.log('Repository - Path : ', params.path);
        target.prototype.path = params.path;
        target.prototype.model = params.model;
        
        Utils.addMetaData(((<any>target).prototype || target), Decorators.REPOSITORY, DecoratorType.CLASS, params);
    };
}
