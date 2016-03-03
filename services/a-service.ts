import {service, inject} from '../decorators';
import * as B1 from './b-service';

@service()
export class A1 {
    constructor(@inject(B1) b: B1.B1) {
    }
}

export default A1;