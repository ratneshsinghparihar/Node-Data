import {inject, service} from '../../di/decorators';
import {CyclicB} from './cyclic-b';

@service()
export class CyclicA {
    constructor(@inject() a: CyclicA) {
    }
}