
import {inject, service} from '../../di/decorators';
import {ServiceA} from './service-a';
import {ServiceB} from './service-b';
import {ServiceC} from './service-c';

@service({singleton: true})
export class ServiceD {

    public serviceA: ServiceA;
    public serviceB: ServiceB;
    public serviceC: ServiceC;

    constructor( @inject() serviceA: ServiceA, @inject() serviceB: ServiceB, @inject() serviceC: ServiceC) {
        this.serviceA = serviceA;
        this.serviceB = serviceB;
        this.serviceC = serviceC;
    }
}