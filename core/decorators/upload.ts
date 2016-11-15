import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';

export function upload(params: { destination: string }): any {
    return function (target: Function, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.UPLOAD,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });
    };
}
