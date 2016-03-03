import {service, inject} from '../decorators';
import * as A1 from './a-service';

@service()
export class B1 {
    constructor(@inject(A1) a: A1.A1) {
    }
}

export default B1;