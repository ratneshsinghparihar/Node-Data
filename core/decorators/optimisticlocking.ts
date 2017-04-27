import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {JsonIgnore} from '../enums/jsonignore-enum';
import { OptimisticLockType } from "../enums/optimisticlock-type";

export function OptimisticLocking(params?: JsonIgnore): any {
    params = params || <any>{};
    return function (target: Object, propertyKey: string) {
        let type = params && params["type"];
        switch(type){
            case OptimisticLockType.VERSION: 
             MetaUtils.addMetaData(target,
              {
                decorator: Decorators.OPTIMISTICLOCK,
                decoratorType: DecoratorType.PROPERTY,
                params: params,
                propertyKey: propertyKey
             });
            break;
        }
    };
}
