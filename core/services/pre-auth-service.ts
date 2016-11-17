import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {IPreauthorizeParams} from '../decorators/interfaces';
import {Decorators} from '../constants/decorators';
import {winstonLog} from '../../logging/winstonLog';
import * as Enumerable from 'linq';
var Q = require('q');

export class PreAuthService {

    static isPreAuthenticated(params, preAuthParam: IPreauthorizeParams, key): Q.Promise<any> {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var service = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == preAuthParam.serviceName).select(x => x.metadata[0]).firstOrDefault();
        if (service) {
            //var param = [];
            //param.push(content);
            //if (preAuthParam.params.entity == '#entity') {
            //    param.push(content);
            //}
            //if (preAuthParam.params.other) {
            //    for (var i in preAuthParam.params.other) {
            //        param.push(preAuthParam.params.other[i]);
            //    }
            //}
            var ret = service.target[preAuthParam.methodName].apply(service.target, params);
            if (Utils.isPromise(ret)) {
                return ret.then(isAllowed => {
                    return isAllowed;
                }).catch((err) => {
                    winstonLog.logError('[PreAuthService: isPreAuthenticated]: error ' + err);
                    throw err;
                });
            }
            else {
                return Q.when(ret);
            }
        }
        return Q.when(true);
    }
}