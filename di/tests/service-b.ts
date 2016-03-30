import {inject, service} from '../../di/decorators';
import {ServiceA} from './service-a';

@service({singleton: false})
export class ServiceB {

    public serviceA: ServiceA;

    constructor(@inject() serviceA: ServiceA) {
        this.serviceA = serviceA;
    }
}