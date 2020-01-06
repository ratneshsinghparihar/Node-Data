import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';

@document({ name: 'PLANET', strict: Strict.true, dynamicName: false, pluralization: false })
export class planet extends baseModel {
    @field()
    age: string;

    @field()
    name: string;
}

export default planet;