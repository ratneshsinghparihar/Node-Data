import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {IPostfilterParams} from './interfaces/postfilter-params';
//var domain = require('../../security/auth/domain');
import {PostFilterService} from '../services/post-filter-service';

export function postfilter(params: IPostfilterParams): any {
    params = params || <any>{};

    return function (target: Function, propertyKey: string, descriptor: any) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.POSTFILTER,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });

        var originalMethod = descriptor.value;

        descriptor.value = function () {
            var result = originalMethod.apply(this, arguments);
            if (Utils.isPromise(result)){
                return result.then(ret => {
                    return PostFilterService.postFilter(ret, params);
                });
            }
            else {
                return PostFilterService.postFilter(result, params);
            }
        }
        return descriptor;
    };
}
