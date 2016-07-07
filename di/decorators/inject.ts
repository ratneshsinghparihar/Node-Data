import {MetaUtils} from '../../core/metadata/utils';
import * as Utils from '../../core/utils';
import {Decorators} from '../../core/constants';
import {DecoratorType} from '../../core/enums/decorator-type';
import {Container} from '../';
import {MetaData} from '../../core/metadata/metadata';
import {ClassType} from '../../core/utils/types';
let Enumerable: any = require('linq');
import {winstonLog} from '../../logging/winstonLog';

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
            winstonLog.logError(`Error in Injection`);
            throw 'Error';
        }
        if (!type) {
            winstonLog.logError(`Error in Injection: inject type cannot be null ${target}`);
            console.log(target);
            throw 'inject type cannot be null';
        }
        return type;
    }

    return function (target: Object | Function, propertyKey: string, parameterIndex?: number) {
        // param decorator
        if (arguments.length === 3) {
            MetaUtils.addMetaData(target,
                {
                    decorator: Decorators.INJECT,
                    decoratorType: DecoratorType.PARAM,
                    params: { type: getInjectType(target, propertyKey, parameterIndex, DecoratorType.PARAM) },
                    propertyKey: propertyKey,
                    paramIndex: parameterIndex
                });
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
                winstonLog.logError(`Error in Injection: Invalid property inject`);
                throw "Invalid property inject";
            }
            // Create new property with getter and setter
            Object.defineProperty(target, propertyKey, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });

            MetaUtils.addMetaData(target,
                {
                    decorator: Decorators.INJECT,
                    decoratorType: DecoratorType.PROPERTY,
                    params: { type: injectType },
                    propertyKey: propertyKey
                });
        }
    }
}

export function injectbyname(injectName?) {
    return function (target: Object | Function, propertyKey: string, parameterIndex?: number) {
        var injectType = Utils.getDesignType(target, propertyKey);
        // property getter
        let injectedProp = null;

        var getter = function () {
            if (!injectedProp) {
                var metas = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
                var meta: MetaData = Enumerable.from(metas).where(x => x.metadata[0].params.serviceName == injectName).select(x => x.metadata[0]).firstOrDefault();
                //injectType = Utils.getDesignParamType(meta.target, undefined);
                injectedProp = Container.resolve(meta.params.target);
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
            winstonLog.logError(`Error in Injection: Invalid property inject`);
            throw "Invalid property inject";
        }
        // Create new property with getter and setter
        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter,
            enumerable: true,
            configurable: true
        });

        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.INJECT,
                decoratorType: DecoratorType.PROPERTY,
                params: { type: injectType },
                propertyKey: propertyKey
            });
    }
}