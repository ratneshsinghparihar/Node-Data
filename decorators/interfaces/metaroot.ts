import {DecoratorMetaData} from './decorator-metadata';


// {"models": {
//     "UserModel": {<DecoratorMetaData>},
//     "TeacherModel": {<DecoratorMetaData>}
// } 
export interface MetaRoot {
    models: { [key: string]: DecoratorMetaData };
}

