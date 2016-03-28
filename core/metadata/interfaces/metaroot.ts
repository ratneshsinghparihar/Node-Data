import {DecoratorMetaData} from './decorator-metadata';


// {"models": {
//     "UserModel": {<DecoratorMetaData>},
//     "TeacherModel": {<DecoratorMetaData>}
// } 
export type MetaRoot = Map<Function | Object, DecoratorMetaData>;
