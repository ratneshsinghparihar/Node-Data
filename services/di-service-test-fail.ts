import {service, inject} from '../decorators';
import {A1} from './a-service';
import {B1} from './b-service';

@service()
export class C {
    constructor() {
    }
}

@service()
export class D {
    aa( @inject() c1: C) {
    }
    constructor(@inject() c: C) {
    }
}

@service()
export class E {
    constructor( @inject() a: A1, @inject() c: C, @inject() d: D) {
    }
}
