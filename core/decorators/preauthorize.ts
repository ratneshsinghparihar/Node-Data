import {MetaUtils } from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {IPreauthorizeParams} from './interfaces/preauthorize-params';
import {PrincipalContext} from '../../security/auth/principalContext';
import {PreAuthService} from '../services/pre-auth-service';
import {pathRepoMap, getEntity} from '../dynamic/model-entity';
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

function mergeTask(args: any, method: any): Q.Promise<any> {
    let prom: Q.Promise<any>;
    var response = [];
    switch (method.name.toUpperCase()) {
        case RepoActions.post.toUpperCase():
            // do nothing
            prom = Q.when(InstanceService.getInstance(this.getEntity(), null, args[0]));
            break;
        case RepoActions.put.toUpperCase():
        case RepoActions.patch.toUpperCase():
            // fetch single object
            prom = this.findMany([args[0]]).then(res => {
                return mergeProperties(res[0], args[1]);
            });
            break;
        case RepoActions.delete.toUpperCase():
            // fetch single object 
            prom = this.findMany([args[0]]).then(res => {
                return res[0];
            });
            break;
        case RepoActions.bulkPost.toUpperCase():
            args[0].forEach(x => {
                response.push(InstanceService.getInstance(this.getEntity(), null, x));
            });
            prom = Q.when(response);
            break;
        case RepoActions.bulkPut.toUpperCase():
            var ids = Enumerable.from(args[0]).select(x => x['_id'].toString()).toArray();
            prom = this.findMany(ids).then(dbEntities => {
                return mergeEntities(dbEntities, args[0]);
            });
            break;
        case RepoActions.bulkDel.toUpperCase():
            if (args[0].length > 0) {
                var ids = [];
                Enumerable.from(args[0]).forEach(x => {
                    if (Utils.isJSON(x)) {
                        ids.push(x['_id']);
                    }
                    else {
                        ids.push(x);
                    }
                });
                prom = this.findMany(ids).then(dbEntities => {
                    return dbEntities;
                });
            }
            else {
                prom = Q.when(args[0]);
            }
            break;
        default:
            prom = Q.when(args[0]);
            break;
    }
    return prom.then(res => {
        return res;
    }).catch(exc => {
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

