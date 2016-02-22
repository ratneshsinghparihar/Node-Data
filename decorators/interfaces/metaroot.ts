import {DecoratorMetaData} from './decorator-metadata';

export interface MetaRoot {
    models: { [key: string]: DecoratorMetaData };
}