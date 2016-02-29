import * as dynamic from '../dynamic/dynamic';
import {Container} from '../di';
import * as MetaUtils from './metadata/utils';
import {Decorators} from '../constants';
import {DecoratorType} from '../enums';

export function service(params: {singleton?: boolean} = <any>{}) {
    return function (target: Function) {
        Container.addService(target, params);
        MetaUtils.addMetaData(target, Decorators.SERVICE, DecoratorType.CLASS, params);
    };
}
