import {ReflectConstants} from '../constants';

declare namespace Reflect {
    function getMetadata(metadataKey: any, target: Object, targetKey: string | symbol): any;
}

export function getDesignType (target, targetKey) {
    return getReflectMetadata(ReflectConstants.DESIGNTYPE, target, targetKey);
}

export function getParamTypes(target, targetKey) {
    return getReflectMetadata(ReflectConstants.DESIGNPARAMTYPES, target, targetKey);
}

export function getReturnType(target, targetKey) {
    return getReflectMetadata(ReflectConstants.DESIGNRETURNTYPE, target, targetKey);
}

function getReflectMetadata(reflectType: string, target: Object | Function, targetKey) {
    return Reflect.getMetadata(reflectType, target, targetKey);
}