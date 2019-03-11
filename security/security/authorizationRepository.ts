
import { entityAction, EntityActionParam } from "../../core/decorators/entityAction";
import { postfilter } from "../../core/decorators/postfilter";
import { DynamicRepository } from '../../core/dynamic/dynamic-repository';
import Q = require('q');

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
        params.forEach((input: EntityActionParam) => { updatedEntities.push(input.newPersistentEntity);})
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
        return this.preBulkDelete(actionParams)
            .then((params: Array<EntityActionParam>) => {
                let entitiesToDelete = actionParams.map(x=>x.newPersistentEntity);
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
        obj[this.getPrimarykey()] = objIds[0];
        return super.bulkPutMany(objIds, obj);
    }

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntity" }) // ACL part
    findOne(id: any, donotLoadChilds?: boolean): Q.Promise<any> {
        let params: EntityActionParam = this.getEntityFromArgs.apply(this, arguments);
        if (!params) {
            params = {};
        }
        return this.preRead(params).then(result => {
            return this.postRead(result).then((updatedParams: EntityActionParam) => {
                return Q.resolve(updatedParams.newPersistentEntity);
            }).catch(exc => {
                return Q.reject(exc);
            });
        }).catch(exc => {
            return Q.reject(exc);
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
    }


    @entityAction({ serviceName: "authorizationService", methodName: "canSaveEntity" })
    post(obj: any): Q.Promise<any> {
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
        return this.preDelete(resultEntityActionObj)
            .then((params: EntityActionParam) => {
                return super.delete(resultEntityActionObj.newPersistentEntity[this.getPrimarykey()]).then((updatedDbObj: any) => {
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

    @entityAction({ serviceName: "authorizationService", methodName: "canReadActionEntities" })
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

}
export default AuthorizationRepository;
