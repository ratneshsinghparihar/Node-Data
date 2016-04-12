//var supertest = require('supertest');
//var application = require('../../server');
//require('reflect-metadata/reflect');
//import {AuthController} from './authcontroller';
//import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
//import * as Utils from '../../core/utils';
//import {Container} from '../../di/di';
//import {AuthService} from './auth-service';
//import {MockAuthService} from '../../unit-test/services/MockService';
//import * as securityUtils from './security-utils';
//import * as configUtils from '../../core/utils';
//import {router} from '../../core/exports';

//describe('AuthControllerFunc', () => {
//    beforeEach((done) => {
//        var mockRepo = new UserRepositoryMock();
//        spyOn(Container, 'resolve').and.callFake((val) => {
//            switch (val) {
//                case AuthService:
//                    return new MockAuthService();
//            }
//        });
//        spyOn(configUtils, 'config').and.returnValue(
//            {
//                'Security': {
//                    'isAutheticationEnabled': 'disabled',
//                    'authenticationType': 'passwordBased'
//                },
//                'facebookAuth': {
//                    'clientID': '11',
//                    'clientSecret': 'aa',
//                    'callbackURL': 'http://localhost:23548/auth/facebook/callback'
//                },
//                'Config': {
//                    'DbConnection': 'mongodb://localhost:27017/userDatabase',
//                    'basePath': "data",
//                    'apiversion': "v1",
//                    'ElasticSearchConnection': 'http://localhost:9200',
//                    'ApplyElasticSearch': false
//                }
//            }
//        );
//        spyOn(Utils, 'getAllResourceNames').and.callFake((val) => {
//            var arr = new Array();
//            arr.push('a');
//            arr.push('b');
//            return arr;
//        })
//        RegisterRoutesForObject(AuthController.prototype);

//        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
//        setTimeout(() => {
//            mockRepo.findByField('a', 'b').then(x => {
//                console.log('value returned from async');
//                done();
//            });
//        }, 100);
//    });

//    it('authController constructor with security disabled', () => {
//        configUtils.config().Security.isAutheticationEnabled = 'disabled';
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(authController).not.toBeNull();
//    });
//    it('authController constructor with security enabled without authorization', () => {
//        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(authController).not.toBeNull();
//    });
//    it('authController constructor with security enabled with authorization', () => {
//        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(authController).not.toBeNull();
//    });
//    it('authcontroller test for / route', () => {
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.get).toHaveBeenCalled();
//        authController['get_/']();
//    });

//    it('authcontroller test for /data route', () => {
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.get).toHaveBeenCalled();
//        authController['get_/data']();
//    });
//    it('authcontroller test for /login route', () => {
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.get).toHaveBeenCalled();
//        authController['get_/login']();
//    });
//    it('authcontroller test for /logout route', () => {
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.get).toHaveBeenCalled();
//        authController['get_/logout']();
//    });
//    it('authcontroller test for /token route', () => {
//        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
//        configUtils.config().Security.authenticationType = 'TokenBased';
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.get).toHaveBeenCalled();
//        authController['get_/token']();
//    });


//    it('authcontroller test for /login post route for 3 arguments', () => {
//        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
//        configUtils.config().Security.authenticationType = 'passwordBased';
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.post).toHaveBeenCalled();
//        authController['post_/login']();
//    });

//    it('authcontroller test for /login post route for 6 arguments', () => {
//        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
//        configUtils.config().Security.authenticationType = 'TokenBased';
//        var authController = new AuthController("/", new UserRepositoryMock());
//        expect(router.post).toHaveBeenCalled();
//        authController['post_/login']();
//    });
//});

//function RegisterRoutesForObject(object: Object) {
//    var res = {}, req = {}, next = function () {

//    };
//    res['render'] = function (a, b) {
//        // do nothing
//    };
//    res['set'] = function (a, b) {
//        // do nothing
//    };
//    res['end'] = function (a, b) {
//        // do nothing
//    };
//    req['get'] = function (a, b) {
//        // do nothing
//    };
//    req['logout'] = function (a, b) {
//        // do nothing
//    };
//    res['redirect'] = function (a, b) {
//        // do nothing
//    };
//    res['cookie'] = function (a, b, c) {
//        // do nothing
//    };
//    req['originalUrl'] = 'abc';
//    var user = new UserRepositoryMock().findByField('a', 'b').then((user) => {
//        req['user'] = user;
//    });
//    req['cookies'] = {};
//    req['cookies']['refreshToken'] = 'aa';

//    spyOn(router, 'get').and.callFake(function () {
//        var name = arguments[0];
//        var fn = arguments[arguments.length - 1];
//        var fun1, fun2, fun3;
//        if (arguments.length >= 5) {
//            fun1 = arguments[1];
//            fun2 = arguments[2];
//            fun3 = arguments[3];
//        }

//        object['get_' + name] = function (name) {
//            var result = {};
//            res['send'] = function (data) {
//                console.log('callback completed');
//                result = data;
//            };

//            if (fun1 != undefined) {
//                fun1(req, res, next);
//            }
//            if (fun2 != undefined) {
//                fun2(req, res, next);
//            }
//            if (fun3 != undefined) {
//                fun3(req, res, next);
//            }
//            fn(req, res);
//            return result;
//        };
//    });
//    spyOn(router, 'post').and.callFake(function () {
//        var name = arguments[0];
//        var fun1, fun2, fun3;
//        if (arguments.length == 6) {
//            fun1 = arguments[2];
//            fun2 = arguments[3];
//            fun3 = arguments[4];
//        }
//        if (arguments.length == 3) {
//            fun1 = arguments[1];
//        }
//        var fn = arguments[arguments.length - 1];
//        object['post_' + name] = function (name) {
//            var result = {};
//            res['send'] = function (data) {
//                console.log('callback completed');
//                result = data;
//            };
//            if (fun1 != undefined) {
//                fun1(req, res, next);
//            }
//            if (fun2 != undefined) {
//                fun2(req, res, next);
//            }
//            if (fun3 != undefined) {
//                fun3(req, res, next);
//            }
//            fn(req, res);
//            return result;
//        };
//    });
//}