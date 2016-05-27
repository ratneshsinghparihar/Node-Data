import {MetaUtils} from "../../core/metadata/utils";
import {DecoratorType} from '../../core/enums/decorator-type';
import {Decorators} from '../constants';

export function transient() {
    return function (target: Object, propertyKey: string) {
        console.log('field - propertyKey: ', propertyKey, ', target:', target);
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.TRANSIENT,
                decoratorType: DecoratorType.PROPERTY,
                propertyKey: propertyKey
            });
    }
}