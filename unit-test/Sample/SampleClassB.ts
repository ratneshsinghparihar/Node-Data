import {router} from "../../core/exports/router";
import * as global from './GlobalObject';
var Q = require('q');

export class B {

    counter: number = 0;
    private name;

    constructor(name?: string) {
        this.name = name;
        this.addRoutes();
    }

    getName(): string {
        //this.privatePrint();
        console.log(global.GetCounterValue());
        return "class B";
    }

    private addRoutes() {
        router.get('/',
            this.ensureLoggedIn(),
            (req, res) => {
                console.log('callback is called');
                res.set("Content-Type", "application/json");
                this.counter++;
                var result = {};
                result['name'] = this.name;
                res.send(result);
            });
    }

    private ensureLoggedIn() {
        return function (req, res, next) {
            next();
        }
    }

    // should not be tested seperately
    private privatePrint() {
        console.log("private function from B");
    }

    asyncWithQnBind(): Q.Promise<any> {
        return Q.nbind(this.asyncEvaluation, this)({})
            .then(result => {
                console.log('nbind executed');
                return result;
            });
    }

    asyncEvaluation(): Q.Promise<any> {
        var prom = Q.fcall(this.wait).then(x => {
            console.log('async completed');
            x = !x;
            return x;
        });
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
