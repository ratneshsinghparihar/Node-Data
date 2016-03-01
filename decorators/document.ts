import * as Utils from "./metadata/utils";
import {Decorators} from '../constants';
import {DecoratorType} from '../enums/decorator-type';
import {Strict} from '../enums/document-strict';

export function document(params: { name: string, strict?: Strict} = <any>{}) {
    return function(target: Object){
        console.log('document - target: ', target);

        // add metadata to prototype
        Utils.addMetaData(((<any>target).prototype || target), Decorators.DOCUMENT, DecoratorType.CLASS, params);
    }
}