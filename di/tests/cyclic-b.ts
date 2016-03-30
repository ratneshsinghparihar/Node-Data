import {inject, service} from '../../di/decorators';
import {CyclicA} from './cyclic-a';

@service()
export class CyclicB {
    constructor(@inject() a: CyclicA) {
    }
}