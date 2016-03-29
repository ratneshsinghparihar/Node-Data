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

    doPublish(valid: boolean) {
        console.log(valid);
    }

    doPublishForce(always: any, like: any) {
        console.log('always:' + always + ' like:' + like);
    }

    doWrite() {
        console.log('write');
    }
}
