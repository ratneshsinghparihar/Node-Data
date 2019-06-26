import {Strict} from '../../enums/document-strict';
import {IDecoratorParams} from '../../../core/decorators/interfaces/decorator-params';

export interface IDocumentParams extends IDecoratorParams {
    strict: Strict;
    /**
     * Set false if you want to use same name as the collection name
     * (means letter case conversion and pluralization 
     * )
     */
    pluralization: boolean;
}