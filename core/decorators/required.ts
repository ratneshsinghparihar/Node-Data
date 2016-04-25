import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

export function required(): any {
    return function (target: Object, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.REQUIRED,
                decoratorType: DecoratorType.PROPERTY,
                params: <any>{},
                propertyKey: propertyKey
            });
    };
}
