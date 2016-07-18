import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {JsonIgnore} from '../enums/jsonignore-enum';

export function allowanonymous(params?: JsonIgnore): any {
    params = params || <any>{};
    return function (target: Object, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.ALLOWANONYMOUS,
                decoratorType: DecoratorType.PROPERTY,
                params: params,
                propertyKey: propertyKey
            });
    };
}
