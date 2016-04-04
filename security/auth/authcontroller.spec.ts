var supertest = require('supertest');
var application = require('../../server');
require('reflect-metadata/reflect');
import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
import * as Utils from '../../core/utils';
import {Container} from '../../di/di';
import {AuthService} from './auth-service';
import {MockAuthService} from '../../unit-test/services/MockService';
import * as securityUtils from './security-utils';
import * as configUtils from '../../core/utils';
import {router} from '../../core/exports';

describe('AuthControllerFunc', () => {
    beforeEach(() => {
        spyOn(Container, 'resolve').and.callFake((val) => {
            switch (val) {
                case AuthService:
                    return new MockAuthService();
            }
        });
        spyOn(configUtils, 'config').and.returnValue(
            {
                'Security': {
                    'isAutheticationEnabled': 'disabled',
                    'authenticationType': 'passwordBased'
                },
                'facebookAuth': {
                    'clientID': '11',
                    'clientSecret': 'aa',
                    'callbackURL': 'http://localhost:23548/auth/facebook/callback'
                },
                'Config': {
                    'DbConnection': 'mongodb://localhost:27017/userDatabase',
                    'basePath': "data",
                    'apiversion': "v1",
                    'ElasticSearchConnection': 'http://localhost:9200',
                    'ApplyElasticSearch': false
                }
            }
        );
        spyOn(Utils, 'getAllResourceNames').and.callFake((val) => {
            var arr = new Array();
            arr.push('a');
            arr.push('b');
            return arr;
        })
        RegisterRoutesForObject(AuthController.prototype);
    });

    it('authController constructor with security disabled', () => {
        configUtils.config().Security.isAutheticationEnabled = 'disabled';
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(authController).not.toBeNull();
    });
    it('authController constructor with security enabled without authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(authController).not.toBeNull();
    });
    it('authController constructor with security enabled with authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(authController).not.toBeNull();
    });
    it('authcontroller test for / route', () => {
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(router.get).toHaveBeenCalled();
        authController['get_/']();
    });

    it('authcontroller test for /data route', () => {
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(router.get).toHaveBeenCalled();
        authController['get_/data']();
    });
});

function RegisterRoutesForObject(object: Object) {
    var res = {}, req = {};
    res['render'] = function (a, b) {
        // do nothing
    };
    res['set'] = function (a, b) {
        // do nothing
    };
    req['get'] = function (a, b) {
        // do nothing
    };
    req['originalUrl'] = 'abc';
    req['user'] = UserRepositoryMock;

    spyOn(router, 'get').and.callFake(function (name, param, fn) {
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