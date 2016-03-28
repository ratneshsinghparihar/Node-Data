// spyon should be created for all the external dependencies
// each spyon should be checked with number of paramaters and type of parameters and return type if any
require('reflect-metadata/reflect');

import {AuthService} from '../../security/auth/auth-service';
import {MockAuthService} from './MockService';
import {Container} from '../../di';
var service = require('./Service');
import * as global from './GlobalObject';
import {A} from './SampleClassA';
import {B} from './SampleClassB';

describe('sample', function () {
    
    var getCounterValue = global.GetCounterValue;
    var a_obj, b_obj;
    
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

    it('dependency injection for Authservice using mock object', function () {
        a_obj = new A(b_obj);
        var val = a_obj.authenticate();
        expect(val).toEqual(true);
    });
});