import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {IPreauthorizeParams} from './interfaces/preauthorize-params';

export function preauthorize(params: IPreauthorizeParams): any {
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
