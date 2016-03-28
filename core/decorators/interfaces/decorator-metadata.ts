import {MetaData} from '../../metadata/metadata';

/** {decorator: {
         "field": {
             "_id": {
                 
             },
             "name":{
                 
             }
         },
         "onetomany": {}    
     }
 }**/
export type DecoratorMetaData = { [key: string]: { [key: string]: MetaData } };