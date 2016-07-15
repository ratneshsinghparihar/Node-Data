import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {IPreauthorizeParams} from './interfaces/preauthorize-params';
var domain = require('../../security/auth/domain');
import {PreAuthService} from '../services/pre-auth-service';

export function preauthorize(params: IPreauthorizeParams): any {
    params = params || <any>{};

    return function (target: Function, propertyKey: string, descriptor: any) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.PREAUTHORIZE,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });

        var originalMethod = descriptor.value;

        descriptor.value = function () {
            var meta = MetaUtils.getMetaData(target, Decorators.PREAUTHORIZE, propertyKey);
            if (meta) {

                var req = domain.get('context:req');
                return PreAuthService.isPreAuthenticated(req.body, meta, propertyKey).then(isAllowed => {
                    if (isAllowed) {
                        return originalMethod.apply(this, arguments);
                    }
                    else {
                        throw 'unauthorize access for resource';
                    }
                });
            }
            else {
                return originalMethod.apply(this, arguments);
            }
        }
        return descriptor;
    };
}
