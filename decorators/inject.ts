import * as dynamic from '../dynamic/dynamic';
import * as MetaUtils from './metadata/utils';
import * as Utils from '../utils';
import {Decorators} from '../constants';
import {DecoratorType} from '../enums/decorator-type';
import {Container} from '../di';

export function inject(injectType?) {
    return function (target: Object|Function, propertyKey: string, parameterIndex?: number) {
        // param decorator
        if (!injectType) {
            injectType = Utils.getParamType(target, propertyKey);
        }
        if (arguments.length === 3) {
            MetaUtils.addMetaData(target, Decorators.INJECT, DecoratorType.PARAM, { type: injectType }, propertyKey, parameterIndex);
            return;
        }
        // property decorator
        else {
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