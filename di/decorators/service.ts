import {Container} from '../di';
import * as MetaUtils from '../../core/metadata/utils';
import {Decorators} from '../../core/constants';
import {DecoratorType} from '../../core/enums';

export function service(params?: { singleton?: boolean }) {
    params = params || <any>{};
    params.singleton = true;

    return function (target: Function) {
        Container.addService(target, params);
        MetaUtils.addMetaData(target, Decorators.SERVICE, DecoratorType.CLASS, params);
    };
}
