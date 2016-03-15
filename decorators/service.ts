import {Container} from '../di';
import * as MetaUtils from './metadata/utils';
import {Decorators} from '../constants';
import {DecoratorType} from '../enums';

export function service(params?: { singleton?: boolean }) {
    params = params || <any>{};
    params.singleton = true;

    return function (target: Function) {
        Container.addService(target, params);
        MetaUtils.addMetaData(target, Decorators.SERVICE, DecoratorType.CLASS, params);
    };
}
