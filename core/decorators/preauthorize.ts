import {MetaUtils } from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {IPreauthorizeParams} from './interfaces/preauthorize-params';
import {PrincipalContext} from '../../security/auth/principalContext';
import {PreAuthService} from '../services/pre-auth-service';
import {pathRepoMap, getEntity, getModel} from '../dynamic/model-entity';
import {InstanceService} from '../services/instance-service';
import * as Utils from '../utils';
import {RepoActions} from '../enums/repo-actions-enum';
import * as Enumerable from 'linq';
import Q = require('q');

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
            var anonymous = MetaUtils.getMetaData(target, Decorators.ALLOWANONYMOUS, propertyKey);
            if (anonymous) return originalMethod.apply(this, arguments);
            let args = [];
            args = Array.apply(null, arguments);

            // merge logic
            return mergeTask.apply(this, [args, originalMethod]).then(fullyQualifiedEntities => {
                return PreAuthService.isPreAuthenticated([fullyQualifiedEntities], params, propertyKey).then(isAllowed => {
                    //req.body = fullyQualifiedEntities;
                    if (isAllowed) {
                        // for delete, post action no need to save merged entity else save merged entity to db
                        if (originalMethod.name.toUpperCase() != RepoActions.delete.toUpperCase() && originalMethod.name.toUpperCase() != RepoActions.patch.toUpperCase()) {
                            args[args.length - 1] = fullyQualifiedEntities;
                        }
                        return originalMethod.apply(this, args);
                        //return originalMethod.apply(this, [fullyQualifiedEntities]);
                    }
                    else {
                        var error = 'unauthorize access for resource';
                        var res = PrincipalContext.get('res');
                        if (res) {
                            res.set("Content-Type", "application/json");
                            res.send(403, JSON.stringify(error, null, 4));
                        }
                        throw null;
                    }
                });
            });
        }
        return descriptor;
    }
}

function mergeEntity(args: any, method: any): Q.Promise<any> {
    var entity = args[0];
    var asyncCalls = [];
    // check if entity is array that means it is the bulk action case
    if (entity instanceof Array) {
            asyncCalls.push(mergeTask.apply(this, [entity, method]));
    }
    else {
        asyncCalls.push(mergeTask.apply(this, [args, method])); // args[0] is "id" and args[1] is "entity"
    }

    return Q.allSettled(asyncCalls).then(success => {
        if (asyncCalls.length == 1) {
            return success[0].value;
        }
        else {
            var res = [];
            success.forEach(x => {
                res.push(x.value);
            });
            return res;
        }
    }).catch(error => {
        throw error;
    });
}

function mergeTask(args: any, method: any): Q.Promise<any> {
    let prom: Q.Promise<any>;
    var response = [];
    switch (method.name.toUpperCase()) {
        case RepoActions.post.toUpperCase():
            // do nothing
            prom = Q.nbind(() => {
                return InstanceService.getInstance(this.getEntity(), null, args[0]);
            }, null)();
            break;
        case RepoActions.put.toUpperCase():
        case RepoActions.patch.toUpperCase():
        case RepoActions.delete.toUpperCase():
            // fetch single object
            prom = this.findMany([args[0]]).then(res => {
                return mergeEntities(res[0], args[0]);
            });
            break;
        case RepoActions.bulkPost.toUpperCase():
            prom = Q.nbind(() => {
                args.forEach(x => {
                    response.push(InstanceService.getInstance(this.getEntity(), null, x));
                });
                return response;
            }, null)();
            break;
        case RepoActions.bulkPut.toUpperCase():
            var ids = Enumerable.from(args[0]).select(x => x['_id'].toString()).toArray();
            prom = this.findMany(ids).then(dbEntities => {
                return mergeEntities(dbEntities, args[0]);
            });
            break;
        //case RepoActions.bulkDel.toUpperCase():
        //    var ids = Enumerable.from(args[0]).select(x => x['_id'].toString()).toArray();
        //    prom = this.findMany(ids).then(dbEntities => {
        //        return mergeEntities(dbEntities, args[0]);
        //    });
        //    break;
        // for post action
        default:
            prom = Q.nbind(() => {
                return args[0];
            }, null)();
            break;
    }
    return prom.catch(exc => {
        console.log(exc);
        throw exc;
    });
}

function mergeEntities(dbEntities, entities) {
    var res = [];
    Enumerable.from(entities).forEach(entity => {
        var dbEntity = Enumerable.from(dbEntities).where(x => x['_id'] == entity['_id']).firstOrDefault();
        if (dbEntity) {
            res.push(mergeProperties(dbEntity, entity));
        }
        else {
            res.push(entity);
        }
    });
    return res;
}
    
function mergeProperties(dbEntity, entity) {
    for (var prop in entity) {
        dbEntity[prop] = entity[prop];
    }
    return dbEntity;
}

