import {RoleModel} from './rolemodel';
import {onetomany, manytoone, manytomany} from '../../core/decorators';
import {document} from '../../mongoose/decorators/document'; 
import {field} from '../../mongoose/decorators/field'; 

export class ModelBase {
    @field()
    _id: number;
    
    @field()
    name: string;
    
    @field()
    _links :any;    
}