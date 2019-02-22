import {MetaUtils } from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {PrincipalContext} from '../../security/auth/principalContext';
import * as Utils from "../utils";
import { MetaData } from "../metadata/metadata";
import {pathRepoMap} from '../dynamic/model-entity';
import {ConstantKeys} from '../constants/constantKeys';
var Q = require('q');

export function transaction(params?: any): any {
    params = params || <any>{};

    return function (target: Function, propertyKey: string, descriptor: any) {
        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.TRANSACTION,
                decoratorType: DecoratorType.METHOD,
                params: params,
                propertyKey: propertyKey
            });

        var originalMethod = descriptor.value;
        descriptor.value = function () {
            let transaction = PrincipalContext.get(ConstantKeys.transaction);
            let args = [];
            args = Array.apply(null, arguments);
            if(!transaction && this.path){
                let entityService = Utils.entityService(pathRepoMap[this.path].modelType)
                return entityService.startTransaction().then(transaction=>{
                    PrincipalContext.save(ConstantKeys.transaction,transaction);
                    return executeOriginalMethod.apply(this, [originalMethod, args]).then(result=>{
                        return entityService.commitTransaction(PrincipalContext.get(ConstantKeys.transaction)).then(commit=>{
                            return result;
                        });
                    });
                }).catch(exc=>{
                    return entityService.rollbackTransaction(PrincipalContext.get(ConstantKeys.transaction)).then(result=>{
                        PrincipalContext.save(ConstantKeys.transaction, null);
                        throw exc;
                    })
                });
            }
            else{
                return executeOriginalMethod.apply(this, [originalMethod, args]);
            }
        }
        return descriptor;
    }
}

function executeOriginalMethod(originalMethod, args){
    let ret = originalMethod.apply(this, args);
    if (Utils.isPromise(ret)) {
        return ret;
    }
    else{
        return Q.when(ret);
    }
}