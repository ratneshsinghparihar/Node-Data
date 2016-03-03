import * as dynamic from '../dynamic/dynamic';
import * as MetaUtils from './metadata/utils';
import * as Utils from '../utils';
import {Decorators} from '../constants';
import {DecoratorType} from '../enums/decorator-type';
import {Container} from '../di';

export function inject(injectType?) {
    function getInjectType(target, propertyKey, parameterIndex, decoratorType: DecoratorType) {
        if (injectType) {
            return injectType;
        }
        let type;
        if (decoratorType === DecoratorType.PARAM) {
            var paramTypes: Array<any> = Utils.getDesignParamType(target, propertyKey, parameterIndex);
            type = paramTypes && paramTypes.length && parameterIndex < paramTypes.length
                ? paramTypes[parameterIndex]
                : null;
        } else if (decoratorType === DecoratorType.PROPERTY) {
             type = Utils.getDesignType(target, propertyKey);
        } else {
            throw 'Error';
        }
        if (!type) {
            console.log(target);
            throw 'inject type cannot be null';
        }
        return type;
    }

    return function (target: Object|Function, propertyKey: string, parameterIndex?: number) {
        // param decorator
        if (arguments.length === 3) {
            MetaUtils.addMetaData(target,
                Decorators.INJECT,
                DecoratorType.PARAM,
                { type: getInjectType(target, propertyKey, parameterIndex, DecoratorType.PARAM) },
                propertyKey,
                parameterIndex);
            return;
        }
        // property decorator
        else {
            injectType = getInjectType(target, propertyKey, parameterIndex, DecoratorType.PROPERTY);
            let injectedProp = null;
            // property getter
            var getter = function () {
                if (!injectedProp) {
                    injectedProp = Container.resolve(injectType);
                    //__o.propertyKey = typeof target === 'object'
                    //    ? container.resolve(injectType) // if target is the prototype (in case of public|private)
                    //    : container.resolve(<any>target); // if target is a function (in case of static)
                }
                return injectedProp;
            };

            var setter = function (value) {
                injectedProp = value;
            };

            // Delete property.
            if (!(delete target[propertyKey])) {
                throw "Invalid property inject";
            }
            // Create new property with getter and setter
            Object.defineProperty(target, propertyKey, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });

            MetaUtils.addMetaData(target, Decorators.INJECT, DecoratorType.PROPERTY, { type: injectType }, propertyKey);
        }
    }
}