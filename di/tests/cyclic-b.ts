import {inject, service} from '../../di/decorators';
import {CyclicA} from './cyclic-a';

export class CyclicB {
    constructor(a: CyclicA) {
    }
}