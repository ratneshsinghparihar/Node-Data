
import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

export function jsonignore(): any {
    return function (target: Object, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.JSONIGNORE,
                decoratorType: DecoratorType.PROPERTY,
                params: <any>{},
                propertyKey: propertyKey
            });
    };
}
