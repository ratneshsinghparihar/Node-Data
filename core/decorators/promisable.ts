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

        var getter = function () {
            // find the target property from params.targetKey
            // find the relavent repository from the relationship and fetch all entity data from db
            var allReferencingEntities: Array<MetaData> = CoreUtils.getAllRelationsForTargetInternal(getEntity(this.constructor.name))
            let targetProperties = allReferencingEntities.filter((x: MetaData) => x.propertyKey === params.targetKey);
            if (!targetProperties) {
                return Q.when(true);
            }

            let targerProperty: MetaData = targetProperties[0];

            // if target property already have object filled then no need to fetch again
            if (targerProperty.params.embedded || targerProperty.params.eagerLoading) {
                return Q.when(true);
            }

            let repo = GetRepositoryForName(targerProperty.params.rel);
            return repo.getRootRepo().findMany(this[params.targetKey]).then(results => {
                this[params.targetKey] = results;
                return Q.when(this);
            }).catch(exc => {
                return Q.reject(exc);
            });;
        };

        // Create new property with getter only
        Object.defineProperty(target, propertyKey, {
            get: getter,
            enumerable: true,
            configurable: true
        });

        MetaUtils.addMetaData(target,
            {
                decorator: Decorators.PROMISABLE,
                decoratorType: DecoratorType.PROPERTY,
                params: params,
                propertyKey: propertyKey
            });
    };



}

export interface IPromisableParam {
    targetKey: string;
}