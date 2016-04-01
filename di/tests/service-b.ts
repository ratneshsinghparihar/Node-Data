import {inject, service} from '../../di/decorators';
import {ServiceA} from './service-a';

export class ServiceB {

    public serviceA: ServiceA;

    constructor(serviceA: ServiceA) {
        this.serviceA = serviceA;
    }
}