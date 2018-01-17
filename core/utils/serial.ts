import * as Enumerable from 'linq';
import Q = require('q');
export class SerialTask {
    public static serial(tasks: Array<any>, dataSheets?: Array<any>) {
        var results = [];
        var chain = Q.when();
        tasks.forEach(function (task, key) {

            //var successTask = task.success || task;
            //var failTask = task.fail;
            //var notifyTask = task.notify;

            chain = chain.then(/*success*/
                function () {
                    //results.push(data);
                    //if (data && dataSheets) {
                    //    dataSheets.push(data);
                    //}
                    //if (!successTask) {
                    //    return data; 
                     //}
                    var ret = task([]);
                    if (ret['then']) {
                        ret.then(res => {
                            results[key] = res;
                        });
                    }
                    else {
                        results[key] = ret;
                    }
                    return ret;
                },/*failure*/
                function (reason) {
                    results[key] = reason;
                    return reason;
                    //if (!failTask) { return Q.reject(reason); }
                    //// User defined fail callback
                    //var ret = failTask([reason]);
                    //results[key] = ret;
                    //return ret;
                });
        });
        return chain.then(r => {
            return results;
        });
    }

    public static getTask(scope: any, fn: any, args?: Array<any>) {
        var func = function (closureFnArgs: Array<any>) {
            return fn.apply(scope, args);
        }
        return func;
    }
}