
import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

export function preauthorize(params: { serviceName: string, methodName: string, params: Array<string> }): any {
    params = params || <any>{};

    return function (target: Function, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.PREAUTHORIZE,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });
    };
}
