import {MetaData} from '../metadata/metadata';

export interface FieldMetaData {
    fields: { [key: string]: MetaData };
}