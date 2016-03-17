import * as MetaUtils from './metadata/utils';
import {Decorators} from '../constants';
import {DecoratorType} from '../enums';

export function authorize(params: { roles: Array<string> }): any {
    params = params || <any>{};

    return function (target: Function, propertyKey: string) {
        MetaUtils.addMetaData(target, Decorators.AUTHORIZE, DecoratorType.METHOD, params, propertyKey);
    };
}
