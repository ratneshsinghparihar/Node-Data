import {MetaUtils} from "../../core/metadata/utils";
import {Decorators} from '../../core/constants';
import {DecoratorType} from '../../core/enums/decorator-type';
import {Strict} from '../enums/entity-strict';

export function entity(params: {name:string, tableName: string, timestamps?: boolean, createdAt?: string|boolean, updatedAt?: string|boolean, freezeTableName?:boolean }) {
    params = params || <any>{};
    return function(target: Object){
        // add metadata to prototype
        MetaUtils.addMetaData(((<any>target).prototype || target),
            {
                decorator: Decorators.ENTITY,
                decoratorType: DecoratorType.CLASS,
                params: params
            });
    }
}