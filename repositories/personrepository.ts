import base from "../dynamic/baserepository";
import * as decorator from "../decorators/repository";
import {PersonModel} from '../models/personModel';

@decorator.repository({path : 'person', model : PersonModel})
export default  class PersonRepository {

    findByName() {
    }

    findByNameAndAge() {
    }
    
    findByNameAndLastname(){
    }

}
