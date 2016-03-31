import * as global from './GlobalObject';
var Q = require('q');

export class B {
    constructor() {
    }

    getName(): string {
        //this.privatePrint();
        console.log(global.GetCounterValue());
        return "class B";
    }

    // should not be tested seperately
    private privatePrint() {
        console.log("private function from B");
    }

    asyncEvaluation(): Q.Promise<any> {
        var prom = Q.fcall(this.wait);
        console.log('asyncEvaluation() is called');
        return prom;
    }

    private wait(): boolean {
        var stop = new Date().getTime();
        console.log('wait() is called');
        //while (new Date().getTime() < stop + time) {
        //    ;
        //}
        return true;
    }
}
