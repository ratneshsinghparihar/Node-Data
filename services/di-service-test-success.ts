import {service, inject} from '../decorators';
import {AA} from './aa-service';

@service()
export class BSuccess {
    @inject()
    private a1: AA;

    constructor() {
    }
}