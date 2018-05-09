﻿import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {ExportTypes} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

//export function repository(path: string, model: Function) {
export function repository(params: { path: string, model: any, exportType?: ExportTypes, sharded?: boolean,dedicatedMessenger?:boolean }) {
    //params = params || <any>{};

    return function (target: Function) {
        console.log('Repository - Path : ', params.path);
        target.prototype.path = params.path;
        target.prototype.model = params.model;
        if (params.exportType==undefined) {
            params.exportType = ExportTypes.REST;
        }
        MetaUtils.addMetaData(((<any>target).prototype || target),
            {
                decorator: Decorators.REPOSITORY,
                decoratorType: DecoratorType.CLASS,
               
                params: params
            });
    };
}
