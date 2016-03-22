import * as global from './GlobalObject';

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
}