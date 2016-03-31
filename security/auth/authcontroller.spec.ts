var supertest = require('supertest');
var application = require('../../server');
require('reflect-metadata/reflect');
import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
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
    //it('should respond with json', function (done) {
    //    configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
    //    var authController = new AuthController("/", <any>UserRepositoryMock);
    //    supertest(application)
    //        .get('/')
    //        .set('Accept', 'application/json')
    //        .expect('Content-Type', /json/)
    //        .expect(200)
    //        .end(function (err, res) {
    //            if (err) {
    //                done.fail(err);
    //            } else {
    //                done();
    //            }
    //        });
    //});
});