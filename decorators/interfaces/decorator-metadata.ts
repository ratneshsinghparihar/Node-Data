import {FieldMetaData} from './field-metadata';

export interface DecoratorMetaData {
    decorator: { [key: string]: FieldMetaData };
}