import {RoleModel} from './rolemodel';
import {onetomany, manytoone, manytomany} from '../decorators/association';
import {document} from '../decorators/document'; 
import {field} from '../decorators/field'; 

export class ModelBase {
    @field()
    _id: number;
    
    @field()
    name: string;
    
    @field()
    _links :any;    
}