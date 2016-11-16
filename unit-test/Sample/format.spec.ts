// spyon should be created for all the external dependencies
// each spyon should be checked with number of paramaters and type of parameters and return type if any
require('reflect-metadata/reflect');
var Q = require('q');

import {AuthService} from '../../security/auth/auth-service';
import {MockAuthService} from './MockService';
import {Container} from '../../di';
import * as global from './GlobalObject';
import {A} from './SampleClassA';
import {B} from './SampleClassB';
import {router} from "../../core/exports/router";
import * as Enumerable from 'linq';

xdescribe('sample', function () {
    
    var getCounterValue = global.GetCounterValue;
    var a_obj: A, b_obj: B;
    
    beforeEach(() => {
        // Before creating object, mock the service first
        spyOn(Container, 'resolve').and.callFake((val) => {
            switch (val) {
                case AuthService:
                    return new MockAuthService();
            }
        });

        b_obj = new B();
        spyOn(b_obj, "getName").and.callThrough();
        spyOn(global, "GetCounterValue").and.callThrough();
        spyOn(global, "GetSquare").and.callFake((val) => {
            console.log(val + val);
        });
    });

    xit('check getName() of B object is called', function () {
        a_obj = new A(b_obj);
        expect(b_obj.getName).toHaveBeenCalled();
    });

    xit('check GetCounterValue() of global is called', function () {
        // restoring the original definition so that we can again spyon the function with different behavior
        global.GetCounterValue = getCounterValue; 
        spyOn(global, "GetCounterValue").and.returnValue(10);

        a_obj = new A(b_obj);
        a_obj.nestedGlobalFunctionCall();
        expect(global.GetCounterValue).toHaveBeenCalled();
    });

    xit('check GetSquare() of global is called which takes paramaterized value', function () {
        a_obj = new A(b_obj);
        a_obj.nestedGlobalFunctionWithParam(10);
        expect(global.GetSquare).toHaveBeenCalled();
    });

    xit('dependency injection for Authservice using mock object', function () {
        a_obj = new A(b_obj);
        var val = a_obj.authenticate();
        expect(val).toEqual(true);
    });

    it('making actual promise call and resolving', function () {
        var res = b_obj.asyncEvaluation().then(x => {
        });
        expect(res).toEqual(true);
    });
});

function find(arg: any): Q.Promise<any> {
    console.log('fake is called with argument ', arg);
    return Q.when(arg);
}

describe('asynchronous', function () {
    var b_obj: B;
    var res;
    b_obj = new B();

    describe('replicated nbind', () => {
        beforeEach(function (done) {

            jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
            setTimeout(function () {
                b_obj.asyncWithQnBind().then(x => {
                    res = x;
                    console.log('value returned from async');
                    done();
                });
            }, 500);
        });

        it('passes', function (done) {
            console.log('testing started');
            expect(res).toEqual({});
            done();
        });
    });
});

xdescribe('testing callback', function () {
    var b_obj: B;

    beforeEach(function () {
        RegisterRoutesForObject(B.prototype);
    });

    it('passes', function () {
        console.log('testing started');

        b_obj = new B('mayank');
        expect(router.get).toHaveBeenCalled();
        console.log(b_obj['get_/']());
        expect(b_obj.counter).toEqual(1);

        b_obj = new B('ritesh');
        expect(router.get).toHaveBeenCalled();
        console.log(b_obj['get_/']());
        expect(b_obj.counter).toEqual(1);
    });

});

function RegisterRoutesForObject(object: Object) {
    var res = {}, req = {};
    res['set'] = function (a, b) {
        // do nothing
    };

    spyOn(router, 'get').and.callFake(function () {
        var name = arguments[0];
        var fn = arguments[arguments.length - 1];
        object['get_' + name] = function (name) {
            var result = {};
            res['send'] = function (data) {
                console.log('callback completed');
                result = data;
            };
            fn(req, res);
            return result;
        };
    });
}

function RegisterRoutesForObject1(object: Object) {
    var res = {}, req = {};
    res['set'] = function (a, b) {
        // do nothing
    };

    object['get'] = object['get'] ? object['get'] : function (data) {
        //console.log(this);
        var fn = Enumerable.from(this['routes']).where(x => x.key == ('get_' + data)).select(x => x.value).firstOrDefault();
        //console.log(fn);
    };
    object['post'] = object['post'] ? object['post'] : function (data) {
        Enumerable.from(this['routes']).where(x => x.key === ('post_' + data)).select(x => x.value).firstOrDefault();
    };
    object['put'] = object['put'] ? object['put'] : function (data) {
        Enumerable.from(this['routes']).where(x => x.key == ('put_' + data)).select(x => x.value).firstOrDefault();
    };
    object['patch'] = object['patch'] ? object['patch'] : function (data) {
        Enumerable.from(this['routes']).where(x => x.key == ('patch_' + data)).select(x => x.value).firstOrDefault();
    };
    object['delete'] = object['delete'] ? object['delete'] : function (data) {
        Enumerable.from(this['routes']).where(x => x.key == ('delete_' + data)).select(x => x.value).firstOrDefault();
    };

    spyOn(router, 'get').and.callFake(function (name, param, fn) {
        this['routes'] = this['routes'] ? this['routes'] : new Array<{ key: string, value: any }>();
        var callBack = {};
        callBack['key'] = 'get_' + name;
        callBack['value'] = function (name) {
            var result = {};
            res['send'] = function (data) {
                console.log('callback completed');
                result = data;
            };

            fn(req, res);
            return result;
        };
        //console.log();
        console.log(this);
        this['routes'].push(callBack);
    });

    spyOn(router, 'post').and.callFake(function (name, param, fn) {
        this['routes'] = this['routes'] ? this['routes'] : new Array<{ key: string, value: any }>();
        var callBack = {};
        callBack['key'] = 'post_' + name;
        callBack['value'] = function (name) {
            var result = {};
            res['send'] = function (data) {
                console.log('callback completed');
                result = data;
            };

            fn(req, res);
            return result;
        };
        object['routes'].push(callBack);
    });

    spyOn(router, 'put').and.callFake(function (name, param, fn) {
        this['routes'] = this['routes'] ? this['routes'] : new Array<{ key: string, value: any }>();
        var callBack = {};
        callBack['key'] = 'put_' + name;
        callBack['value'] = function (name) {
            var result = {};
            res['send'] = function (data) {
                console.log('callback completed');
                result = data;
            };

            fn(req, res);
            return result;
        };
        object['routes'].push(callBack);
    });

    spyOn(router, 'patch').and.callFake(function (name, param, fn) {
        this['routes'] = this['routes'] ? this['routes'] : new Array<{ key: string, value: any }>();
        var callBack = {};
        callBack['key'] = 'patch_' + name;
        callBack['value'] = function (name) {
            var result = {};
            res['send'] = function (data) {
                console.log('callback completed');
                result = data;
            };

            fn(req, res);
            return result;
        };
        object['routes'].push(callBack);
    });

    spyOn(router, 'delete').and.callFake(function (name, param, fn) {
        var callBack = {};
        callBack['key'] = 'delete_' + name;
        callBack['value'] = function (name) {
            var result = {};
            res['send'] = function (data) {
                console.log('callback completed');
                result = data;
            };

            fn(req, res);
            return result;
        };
        object['routes'].push(callBack);
    });
}
