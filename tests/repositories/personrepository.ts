import {repository} from "../../core/decorators";
import {PersonModel} from '../models/personModel';

@repository({path : 'person', model : PersonModel})
export default  class PersonRepository {

    findByName() {
    }

    findByNameAndAge() {
    }
    
    findByNameAndLastname(){
    }

}
