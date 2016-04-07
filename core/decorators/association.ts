import {Decorators} from '../constants';
import {DecoratorType} from '../enums';
import {ParamTypeCustom} from '../metadata/param-type-custom';

import {MetaUtils} from "../metadata/utils";
import {IAssociationParams} from './interfaces/association-params';
import * as ReflectUtils from '../reflect/reflect-utils';

export function onetomany(params: IAssociationParams) {
    return (target: Object, propertyKey: string) => addMetadata(target, propertyKey, Decorators.ONETOMANY, params);
}

export function manytoone(params: IAssociationParams) {
    return (target: Object, propertyKey: string) => addMetadata(target, propertyKey, Decorators.MANYTOONE, params);
}

export function manytomany(params: IAssociationParams) {
    return (target: Object, propertyKey: string) => addMetadata(target, propertyKey, Decorators.MANYTOMANY, params);
}

export function onetoone(params: IAssociationParams) {
    return (target: Object, propertyKey: string) => addMetadata(target, propertyKey, Decorators.ONETOONE, params);
}

function addMetadata(target: Object, propertyKey: string, decorator: string, params: IAssociationParams) {
    params = params || <any>{};
    
    var name = target.constructor.name;
    console.log(decorator, ' - propertyKey: ', propertyKey, ', target:', target.constructor && target.constructor.name);

    let itemType = ReflectUtils.getDesignType(target, propertyKey);
    let type = (params && params.itemType)
        ? new ParamTypeCustom(params.itemType, itemType === Array)
        : new ParamTypeCustom(itemType, false);
    MetaUtils.addMetaData(
        target,
        {
            decorator: decorator,
            decoratorType: DecoratorType.PROPERTY,
            params: params,
            propertyKey: propertyKey,
            type: type
        });
}