import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {JsonIgnore} from '../enums/jsonignore-enum';


/**
 * Ignores the property for an update in db from frontend or any external api source.
 * Params: An optional parameter, if no parameter supplied means the property will not be available in frontend at all.
 * if parameter Jsonignore.READ means the property will be available to frontend side but readonly mode. (can't altered by any external api in db)
 * @param params
 */
export function jsonignore(params?: JsonIgnore): any {
    params = params || <any>{};
    return function (target: Object, propertyKey: string) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.JSONIGNORE,
                decoratorType: DecoratorType.PROPERTY,
                params: params,
                propertyKey: propertyKey
            });
    };
}
