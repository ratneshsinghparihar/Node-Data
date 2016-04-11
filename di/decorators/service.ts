import {Container} from '../di';
import {MetaUtils} from '../../core/metadata/utils';
import {Decorators} from '../../core/constants';
import {DecoratorType} from '../../core/enums';
import {ClassType} from '../../core/utils/classtype';

export function service(params?: { singleton?: boolean, serviceName?: string }) {
    params = params || <any>{};
    params.singleton = true;

    return function (target: ClassType<any>) {
        Container.addService(target, params);
        params['target'] = target;
        MetaUtils.addMetaData(target, {
            decorator: Decorators.SERVICE,
            decoratorType: DecoratorType.CLASS,
            params: params
        });
    };
}
