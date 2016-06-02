import {Strict} from '../../enums/document-strict';
import {IDecoratorParams} from '../../../core/decorators/interfaces/decorator-params';

export interface IDocumentParams extends IDecoratorParams {
    strict: Strict;
}