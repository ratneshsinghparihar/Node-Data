import * as Utils from "../../core/metadata/utils";
import {Decorators} from '../../core/constants';
import {DecoratorType} from '../../core/enums/decorator-type';
import {Strict} from '../enums/document-strict';

export function document(params: { name: string, strict?: Strict }) {
    params = params || <any>{};
    return function(target: Object){
        // add metadata to prototype
        Utils.addMetaData(((<any>target).prototype || target), Decorators.DOCUMENT, DecoratorType.CLASS, params);
    }
}