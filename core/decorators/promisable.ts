import {MetaUtils} from "../metadata/utils";
import {Decorators} from '../constants/decorators';
import {DecoratorType} from '../enums/decorator-type';
import * as Utils from '../../mongoose/utils';
import * as CoreUtils from "../utils";
import {getEntity, getModel} from '../../core/dynamic/model-entity';
import * as Enumerable from 'linq';
import {MetaData} from '../../core/metadata/metadata';
import {IAssociationParams} from '../../core/decorators/interfaces';
import {IFieldParams, IDocumentParams} from '../../mongoose/decorators/interfaces';
import {IDynamicRepository, GetRepositoryForName} from '../dynamic/dynamic-repository';
import Q = require('q');


export function promisable(params: IPromisableParam): any {
    params = params || <any>{};
    return function (target: Object, propertyKey: string, parameterIndex?: number) {

        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.PROMISABLE,
                decoratorType: DecoratorType.PROPERTY,
                params: params,
                propertyKey: propertyKey
            });
         
        var getter = function (refresh: boolean) {

            // find the target property from params.targetKey
            // find the relavent repository from the relationship and fetch all entity data from db
            var allReferencingEntities: Array<MetaData> = CoreUtils.getAllRelationsForTargetInternal(target);
            let targetProperties = allReferencingEntities.filter((x: MetaData) => x.propertyKey === params.targetKey);
            if (!targetProperties) {
                return Q.reject(`the targer property ${params.targetKey} either does not exist or does not have any relationship asscociated with it.`);
            }

            let targerPropertyMeta: MetaData = targetProperties[0];
            let ghostKey = "__ghostKey_" + params.targetKey;
            let ghostKeyData = undefined;

            //// if target property already have object filled then no need to fetch again
            //if (targerPropertyMeta.params.embedded || targerPropertyMeta.params.eagerLoading) {
            //    return Q.when(this[params.targetKey]);
            //}

            if (!refresh && this[ghostKey]) {
                return this[ghostKey];
            }

            let repo = GetRepositoryForName(targerPropertyMeta.params.rel);
            if (!repo) {
                return Q.reject(`the targer property ${params.targetKey}'s model's repository does not exist.`);
            }

            if (!Object.getOwnPropertyDescriptor(this, ghostKey)) {

                Object.defineProperty(this, ghostKey, {
                    get: () => {
                        return ghostKeyData;
                    },
                    set: (val) => {
                        ghostKeyData = val;
                    }
                });
            }

            // case for onetomany, manytomany relationship type
            if (targerPropertyMeta.propertyType.isArray) {
                let ids = [];
                if (!this[params.targetKey] || !this[params.targetKey].length) {
                    return Q.when([]);
                }
                if (Utils.isBasonOrStringType(this[params.targetKey][0])) {
                    ids = this[params.targetKey];
                }
                else {
                    ids = this[params.targetKey].map(x => x._id);
                }
                return repo.getRootRepo().findMany(ids, true).then(results => {
                    this[ghostKey] = results;
                    return Q.when(results);
                }).catch(exc => {
                    return Q.reject(exc);
                });
            }
            // case for onetoone, manytoone relationship type
            else {
                let id = "";
                if (!this[params.targetKey]) {
                    Q.when({});
                }
                if (Utils.isBasonOrStringType(this[params.targetKey])) {
                    id = this[params.targetKey];
                }
                else {
                    id = this[params.targetKey]._id;
                }
                return repo.getRootRepo().findOne(id).then(result => {
                    this[ghostKey] = result;
                    return Q.when(result);
                }).catch(exc => {
                    return Q.reject(exc);
                });;
            }
        };

        target[propertyKey] = getter;

    };



}

export interface IPromisableParam {
    targetKey: string;
}