import {MetaUtils} from "../metadata/utils";
import * as Utils from "../utils";
import {IPostfilterParams} from '../decorators/interfaces';
import {Decorators} from '../constants/decorators';
import {winstonLog} from '../../logging/winstonLog';
import * as Enumerable from 'linq';
var Q = require('q');
var serviceCollection = {};

export class PostFilterService {

   

    static postFilter(result, preAuthParam: IPostfilterParams): Q.Promise<any> {
        var service;
        if (serviceCollection[preAuthParam.serviceName]) {
            service = serviceCollection[preAuthParam.serviceName];
        }
        else {
            var services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
            service = Enumerable.from(services).where(x => x.metadata[0].params.serviceName == preAuthParam.serviceName).select(x => x.metadata[0]).firstOrDefault();

        }
        if(service) {
            serviceCollection[preAuthParam.serviceName] = service;
            var param = [];
            param.push(result);
            let ret = service.target[preAuthParam.methodName].call(service.target, ...param);
            if (Utils.isPromise(ret)) {
                //console.timeEnd("postFilter_" + preAuthParam.serviceName);
                return ret.then(result => {
                    return result;
                }).catch((err) => {
                    winstonLog.logError('[PostFilterService: postFilter]: error ' + err);
                    throw err;
                });
            }
            else {
                //console.timeEnd("postFilter_" + preAuthParam.serviceName);
                return Q.when(ret);
            }
        }
        return Q.when(true);
    }
}
