import {Strict} from '../../enums/document-strict';
import {IDecoratorParams} from '../../../core/decorators/interfaces/decorator-params';

export interface IDocumentParams extends IDecoratorParams {
    name: string;
    strict: Strict;
    dynamicName: boolean;
    disablePlurize: boolean
}