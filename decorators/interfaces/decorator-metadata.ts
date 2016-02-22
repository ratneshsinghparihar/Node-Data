import {FieldMetaData} from './field-metadata';
import {MetaData} from '../metadata/metadata';

export interface DecoratorMetaData {
    decorator: { [key: string]: { [key: string]: MetaData }};
}