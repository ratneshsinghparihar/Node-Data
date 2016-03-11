import * as global from './GlobalObject';
import {B} from './SampleClassB';

export class A {
    constructor(B: B) {
        console.log(B.getName());
    }

    nestedGlobalFunctionCall() {
        var b_obj = new B();
        console.log(global.GetCounterValue());
    }

    nestedGlobalFunctionWithParam(val: number) {
        console.log(global.GetSquare(val));
    }
}