import {inject, service} from '../../di/decorators';
import {ServiceA} from './service-a';
import {ServiceB} from './service-b';

@service({singleton: false})
export class ServiceC {

    public serviceA: ServiceA;
    public serviceB: ServiceB;

    constructor( @inject() serviceA: ServiceA, @inject() serviceB: ServiceB) {
        this.serviceA = serviceA;
        this.serviceB = serviceB;
    }
}