import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import {IPreauthorizeParams} from './interfaces/preauthorize-params';
import {PrincipalContext} from '../../security/auth/principalContext';
import {PreAuthService} from '../services/pre-auth-service';
import {pathRepoMap, getEntity, getModel} from '../dynamic/model-entity';
import {InstanceService} from '../services/instance-service';
import * as Utils from '../utils';
import {RepoActions} from '../enums/repo-actions-enum';
var Q = require('q');

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

            var req = PrincipalContext.get('req');
            var entity = req ? req.body : null;
            let args = [];
            args = Array.apply(null, arguments);

            // merge logic
            return mergeEntity.apply(this, [entity, req]).then(mergedEntities => {
                let fullyQualifiedEntities = []; // hetrogenious obj
                // for bulk action case
                if (entity instanceof Array) {
                    mergedEntities.forEach(e => {
                        fullyQualifiedEntities.push(e.value);
                    });
                }
                else {
                    // for single action
                    fullyQualifiedEntities = mergedEntities[0].value;
                }

                return PreAuthService.isPreAuthenticated([fullyQualifiedEntities], params, propertyKey).then(isAllowed => {
                    if (isAllowed) {
                        // for delete, post action no need to save merged entity else save merged entity to db
                        if (req.method.toUpperCase() != RepoActions.delete.toUpperCase() && req.method.toUpperCase() != RepoActions.patch.toUpperCase()) {
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

function mergeEntity(entity: any, req: any): Q.Promise<any> {
    var asyncCalls = [];
    // check if entity is array or object that means it is the bulk action case
    if (entity instanceof Array) {
        entity.forEach(e => {
            asyncCalls.push(mergeTask.apply(this, [e, req, e._id]));
        });
    }
    else {
        // for delete and patch action case find id from req.params.id
        if (req.method.toUpperCase() == RepoActions.delete.toUpperCase() || req.method.toUpperCase() == RepoActions.patch.toUpperCase())
            asyncCalls.push(mergeTask.apply(this, [entity, req, req.params.id]));
        else
            asyncCalls.push(mergeTask.apply(this, [entity, req, entity._id]));
    }

    return Q.allSettled(asyncCalls).then(success => {
        return success;
    }).catch(error => {
        throw error;
    });
}

function mergeTask(entity: any, req: any, id: any): Q.Promise<any> {

    switch (req.method.toUpperCase()) {
        // for post action
        case RepoActions.post.toUpperCase():
            let newDbEntityObj = InstanceService.getInstance(this.getEntity(), null, entity);
            return Q.when(newDbEntityObj);

        // for delete action find id from req.params and return db object directly, no need to merge
        case RepoActions.delete.toUpperCase():
            return this.findOne(id).then(dbEntity => {
                return Q.when(dbEntity);
            });

        // for patch action find id from req.params and return db object directly, no need to merge
        case RepoActions.patch.toUpperCase():
            return this.findOne(id).then(dbEntity => {
                return Q.when(dbEntity);
            });

        // for other actions find corresponding entity from db and merge it
        default:
            return this.findOne(id).then(dbEntity => {
                let newDbEntityObj = InstanceService.getInstance(this.getEntity(), null, dbEntity);
                let decFields = MetaUtils.getMetaData(this.getEntity(), Decorators.JSONIGNORE);

                //// remove all jsonIgnore field from res.body object
                if (decFields) {
                    decFields.forEach(field => {
                        delete entity[field.propertyKey];
                    });
                }

                // merge res body entity with db entity
                if (entity) {
                    for (var prop in entity) {
                        newDbEntityObj[prop] = entity[prop];
                    }
                }
                return Q.when(newDbEntityObj);
            });
    }
}
