import { repository } from "../core/decorators";
import { preauthorize } from "../core/decorators/preauthorize";
import { entityAction, EntityActionParam } from "../core/decorators/entityAction";
import { postfilter } from "../core/decorators/postfilter";
import { authorize } from "../core/decorators/authorize";
import { } from '../di/decorators/inject';
import { DynamicRepository } from '../core/dynamic/dynamic-repository';
import { inject } from '../di/decorators/inject';
import Q = require('q');
import * as mongooseHelper from '../mongoose/mongoose-model-helper';


export class AuthorizationRepository extends DynamicRepository {

    preCreate(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.resolve(params);
    }

    postCreate(params: EntityActionParam): Q.Promise<any> {
        return Q.when(params.newPersistentEntity);
    }

    preUpdate(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.resolve(params);
    }

    postUpdate(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.when(params);
    }


    preBulkCreate(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.resolve(params);
    }

    preBulkDelete(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.resolve(params);
    }

    postBulkCreate(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        var updatedEntities = [];
        params.forEach((input: EntityActionParam) => { updatedEntities.push(input.newPersistentEntity); })
        return Q.when(updatedEntities);
    }

    preBulkUpdate(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params);
    }

    postBulkUpdate(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        var updatedEntities = [];
        params.forEach((input: EntityActionParam) => { updatedEntities.push(input.newPersistentEntity); })
        return Q.when(updatedEntities);
    }

    preDelete(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.when(params);
    }

    postDelete(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.when(params.newPersistentEntity);
    }

    postBulkDelete(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        var updatedEntities = [];
        params.forEach((input: EntityActionParam) => { updatedEntities.push(input.newPersistentEntity); })
        return Q.when(updatedEntities);
    }

    preRead(params: EntityActionParam): Q.Promise<EntityActionParam> {
        return Q.when(params);
    }

    postRead(params: EntityActionParam): Q.Promise<any> {
        return Q.when(params);
    }

    preBulkRead(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params);
    }

    postBulkRead(params: Array<EntityActionParam>): Q.Promise<Array<EntityActionParam>> {
        return Q.when(params);
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntities" })
    bulkPost(objArr: Array<any>, batchSize?: number): Q.Promise<any> {
        let actionEntities: Array<EntityActionParam> = this.getEntityFromArgs.apply(this, arguments);
        if (!actionEntities) {
            actionEntities = [];
        }
        this.logEntityInfo("bulkPost", objArr);
        return this.preBulkCreate(actionEntities)
            .then((params: Array<EntityActionParam>) => {
                let entitiesToCreate: Array<any> = new Array<any>();
                params.forEach((input: EntityActionParam) => { entitiesToCreate.push(input.inputEntity); });
                arguments[0] = entitiesToCreate;
                arguments[arguments.length - 1] = undefined;
                return super.bulkPost.apply(this, arguments).then((createdDbOEntites: Array<any>) => {
                    let indexInMainCollection: number = 0;
                    createdDbOEntites.forEach((createdEntity) => {
                        actionEntities[indexInMainCollection].newPersistentEntity = createdEntity;
                        indexInMainCollection++;
                    })

                    return this.postBulkCreate(actionEntities);
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });

    }

    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntities" })
    bulkPut(objArr: Array<any>, batchSize?: number) {
        if (!objArr || !objArr.length) return Q.when(objArr);
        let actionEntities: Array<EntityActionParam> = this.getEntityFromArgs.apply(this, arguments);
        if (!actionEntities) {
            actionEntities = [];
        }
        this.logEntityInfo("bulkPut", objArr);
        return this.preBulkUpdate(actionEntities)
            .then((params: Array<EntityActionParam>) => {
                let entitiesToCreate: Array<any> = new Array<any>();
                params.forEach((input: EntityActionParam) => { entitiesToCreate.push(input.newPersistentEntity); })
                arguments[0] = entitiesToCreate;
                arguments[arguments.length - 1] = undefined;
                return super.bulkPut.apply(this, arguments).then((createdDbOEntites: Array<any>) => {
                    let indexInMainCollection: number = 0;
                    createdDbOEntites.forEach((createdEntity) => {
                        actionEntities[indexInMainCollection].newPersistentEntity = createdEntity;
                        indexInMainCollection++;
                    })

                    return this.postBulkUpdate(actionEntities);
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntities" })
    bulkDel(params: Array<any>) {
        let actionParams: Array<EntityActionParam> = this.getEntityFromArgs.apply(this, arguments);
        let entitiesToDelete = [];
        if (!actionParams) {
            actionParams = [];
        }
        this.logEntityInfo("bulkDel", params);
        actionParams.forEach((input: EntityActionParam) => { entitiesToDelete.push(input.newPersistentEntity); })
        return this.preBulkDelete(actionParams)
            .then((params: Array<EntityActionParam>) => {
                return super.bulkDel(entitiesToDelete).then((updatedDbObj: Array<any>) => {
                    return this.postBulkDelete(actionParams);
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });
    }

    // TODO: need to disccus whether we need to secure bulkPutMany action since it is not exposed  api, it is consumed by server only.
    //@entityAction({ serviceName: "authorizationService", methodName: "canSaveEntities" })
    public bulkPutMany(objIds: Array<any>, obj: any) {
        obj._id = objIds[0];
        this.logEntityInfo("bulkPutMany", objIds);
        return super.bulkPutMany(objIds, obj);
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntity" }) // ACL part
    findOne(id: any): Q.Promise<any> {
        let params: EntityActionParam = this.getEntityFromArgs.apply(this, arguments);
        if (!params) {
            params = {};
        }
        return this.postRead(params).then((updatedParams: EntityActionParam) => {
            return Q.resolve(updatedParams.newPersistentEntity);
        },
            (error) => {
                return Q.reject(error);
            });
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntities" }) // ACL part
    findMany(ids: Array<any>, toLoadEmbededChilds?: boolean): Q.Promise<any> {
        let actionEntities: Array<EntityActionParam> = this.getEntityFromArgs.apply(this, arguments);
        if (!actionEntities) {
            actionEntities = [];
        }
        return this.preBulkRead(actionEntities).then(results => {
            return this.postBulkRead(results).then(newResults => {
                return Q.when(newResults.map(entity => entity.newPersistentEntity));
            }).catch(exc => {
                return Q.reject(exc);
            });
        }).catch(exc => {
            return Q.reject(exc);
        });
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntities" }) // ACL part
    findWhere(query, selectedFields?: Array<any> | any, queryOptions?: any, toLoadChilds?: boolean): Q.Promise<any> {
        let actionEntities: Array<EntityActionParam> = this.getEntityFromArgs.apply(this, arguments);
        if (!actionEntities) {
            actionEntities = [];
        }
        return this.preBulkRead(actionEntities).then(results => {
            return this.postBulkRead(results).then(newResults => {
                return Q.when(newResults.map(entity => entity.newPersistentEntity));
            }).catch(exc => {
                return Q.reject(exc);
            });
        }).catch(exc => {
            return Q.reject(exc);
        });
    }

    findByField(fieldName, value): Q.Promise<any> {
        return super.findByField(fieldName, value);
    }

    @postfilter({ serviceName: "authorizationService", methodName: "canReadChildren" }) // ACL part
    findChild(id, prop): Q.Promise<any> {
        return super.findChild(id, prop);
    }


    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntity" })
    put(id: any, obj: any): Q.Promise<any> {
        let resultEntityActionObj: EntityActionParam = this.getEntityFromArgs.apply(this, arguments);
        if (!resultEntityActionObj) {
            resultEntityActionObj = {};
        }
        this.logEntityInfo("put", obj);
        return this.preUpdate(resultEntityActionObj)
            .then((params: EntityActionParam) => {
                return super.put(id, params.newPersistentEntity).then((updatedDbObj: any) => {
                    resultEntityActionObj.newPersistentEntity = updatedDbObj;
                    return this.postUpdate(resultEntityActionObj).then((updatedEntity: EntityActionParam) => {
                        return Q.when(updatedEntity.newPersistentEntity);
                    }, (exc) => {
                        return Q.reject(exc);
                    });
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });
        //return super.put(id, obj);
    }


    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntity" })
    post(obj: any): Q.Promise<any> {
        this.logEntityInfo("post", obj);
        let resultEntityActionObj: EntityActionParam = this.getEntityFromArgs.apply(this, arguments);
        if (!resultEntityActionObj) {
            resultEntityActionObj = {};
        }
        return this.preCreate(resultEntityActionObj)
            .then((params: EntityActionParam) => {
                return super.post(params.inputEntity).then((updatedDbObj: any) => {
                    resultEntityActionObj.newPersistentEntity = updatedDbObj;
                    return this.postCreate(resultEntityActionObj);
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canDeleteEntity" })
    delete(obj: any) {
        let resultEntityActionObj: EntityActionParam = this.getEntityFromArgs.apply(this, arguments);
        if (!resultEntityActionObj) {
            resultEntityActionObj = {};
        }
        this.logEntityInfo("delete", resultEntityActionObj.newPersistentEntity._id);
        return this.preDelete(resultEntityActionObj)
            .then((params: EntityActionParam) => {
                return super.delete(resultEntityActionObj.newPersistentEntity._id).then((updatedDbObj: any) => {
                    resultEntityActionObj.newPersistentEntity = updatedDbObj;
                    return this.postDelete(resultEntityActionObj);
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntity" })
    patch(id: any, obj) {
        this.logEntityInfo("patch", obj);
        let resultEntityActionObj: EntityActionParam = this.getEntityFromArgs.apply(this, arguments);
        if (!resultEntityActionObj) {
            resultEntityActionObj = {};
        }
        return this.preUpdate(resultEntityActionObj)
            .then((params: EntityActionParam) => {
                return super.patch(id, params.inputEntity).then((updatedDbObj: any) => {
                    resultEntityActionObj.newPersistentEntity = updatedDbObj;
                    // return this.postUpdate(resultEntityActionObj.newPersistentEntity);
                    return this.postUpdate(resultEntityActionObj).then((updatedEntity: EntityActionParam) => {
                        return Q.when(updatedEntity.newPersistentEntity);
                    }, (exc) => {
                        return Q.reject(exc);
                    });
                }, (error) => {
                    return Q.reject(error);
                })
            }, (error) => {
                return Q.reject(error);
            });

    }

    // @authorize({ roles: ['ROLE_A'] }) // Authorization part
    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntities" }) // ACL part
    findAll(): any {
        let actionEntities: Array<EntityActionParam> = this.getEntityFromArgs.apply(this, arguments);
        if (!actionEntities) {
            actionEntities = [];
        }
        return this.postBulkRead(actionEntities).then((newResults: Array<EntityActionParam>) => {
            return Q.when(newResults.map((x: EntityActionParam) => x.newPersistentEntity));
        }).catch(exc => {
            return Q.reject(exc);
        });
    }

    getEntityType(): any {
        return super.getEntityType();
    }

    private getEntityFromArgs() {
        let args: Array<any> = Array.apply(null, arguments);
        let params: EntityActionParam = <EntityActionParam>args[args.length - 1];
        return params;
    }

    private logEntityInfo(methodName: string, obj: any) {

        // let incomingJsonLog = {
        //     MenthodName: methodName,
        //     EntityObj: obj
        // };

        //this.logger.logInfo(incomingJsonLog);
    }

}
export default AuthorizationRepository;