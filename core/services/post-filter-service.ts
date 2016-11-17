import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {IPostfilterParams} from '../decorators/interfaces';
import {Decorators} from '../constants/decorators';
import {winstonLog} from '../../logging/winstonLog';
import * as Enumerable from 'linq';
var Q = require('q');

export class PostFilterService {

    static postFilter(result, preAuthParam: IPostfilterParams): Q.Promise<any> {
        var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
        var service = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == preAuthParam.serviceName).select(x => x.metadata[0]).firstOrDefault();
        if (service) {
            var param = [];
            param.push(result);
            var ret = service.target[preAuthParam.methodName].apply(service.target, param);
            if (Utils.isPromise(ret)) {
                return ret.then(result => {
                    return result;
                }).catch((err) => {
                    winstonLog.logError('[PostFilterService: postFilter]: error ' + err);
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