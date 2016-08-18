import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

export function transient(): any {
    return function (target: Object, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.TRANSIENT,
                decoratorType: DecoratorType.PROPERTY,
                params: <any>{},
                propertyKey: propertyKey
            });
    };
}
