
import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

export function authorize(params: { roles: Array<string> }): any {
    params = params || <any>{};

    return function (target: Function, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.AUTHORIZE,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });
    };
}
