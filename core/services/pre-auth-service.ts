import {MetaUtils} from "../metadata/utils";
import {IPreauthorizeParams} from '../decorators/interfaces';
import {Decorators} from '../constants/decorators';
import {winstonLog} from '../../logging/winstonLog';
var Enumerable: linqjs.EnumerableStatic = require('linq');
var Q = require('q');

export class PreAuthService {

    static isPreAuthenticated(req, entityType, key): Q.Promise<any> {
        var preAuth = MetaUtils.getMetaData(entityType, Decorators.PREAUTHORIZE, key);
        if (preAuth) {
            var preAuthParam = <IPreauthorizeParams>preAuth.params;
            var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
            var service = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == preAuthParam.serviceName).select(x => x.metadata[0]).firstOrDefault();

            if (service) {
                var param = [];
                if (preAuthParam.params.id == '#id' && req.user) {
                    param.push(req.user._id.toString());
                }
                if (preAuthParam.params.entity == '#entity') {
                    param.push(req.body);
                }
                if (preAuthParam.params.other) {
                    for (var i in preAuthParam.params.other) {
                        param.push(preAuthParam.params.other[i]);
                    }
                }
                var ret = service.target[preAuthParam.methodName].apply(service.target, param);
                if (ret && ret['then'] instanceof Function) {
                    return ret.then(isAllowed => {
                        return isAllowed;
                    }).catch((err) => {
                        winstonLog.logError('[DynamicController: isPreAuthenticated]: error ' + err);
                        throw err;
                    });
                }
                else {
                    return Q.when(ret);
                }
            }
        }
        return Q.when(true);
    }
}