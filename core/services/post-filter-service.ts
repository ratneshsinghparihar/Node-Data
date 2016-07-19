import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {IPostfilterParams} from '../decorators/interfaces';
import {Decorators} from '../constants/decorators';
import {winstonLog} from '../../logging/winstonLog';
var Enumerable: linqjs.EnumerableStatic = require('linq');
var Q = require('q');

export class PostFilterService {

    static postFilter(result, postFilter): Q.Promise<any> {
        var preAuthParam = <IPostfilterParams>postFilter.params;
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