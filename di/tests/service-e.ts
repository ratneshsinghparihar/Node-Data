
import {inject, service} from '../../di/decorators';
import {ServiceA} from './service-a';
import {ServiceB} from './service-b';

export class ServiceE {

    public serviceA: ServiceA;
    public serviceB: ServiceB;

    constructor(serviceA: ServiceA, serviceB: ServiceB) {
        this.serviceA = serviceA;
        this.serviceB = serviceB;
    }
}

export default ServiceE;