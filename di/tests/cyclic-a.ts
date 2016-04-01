import {inject, service} from '../../di/decorators';
import {CyclicB} from './cyclic-b';

export class CyclicA {
    constructor(a: CyclicA) {
    }
}