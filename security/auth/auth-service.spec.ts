require('reflect-metadata/reflect');
import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
import {Container} from '../../di/di';
import UserRepository from '../../tests/repositories/userRepository';
import {AuthService} from './auth-service';
import {MockAuthService} from '../../unit-test/services/MockService';
import * as securityUtils from './security-utils';
import * as configUtils from '../../core/utils';

describe('AuthServiceFunc', () => {
    beforeEach(() => {
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
                   'DbConnection' : 'mongodb://localhost:27017/userDatabase',
                   'basePath' : "data",
                   'apiversion' : "v1",
                   'ElasticSearchConnection' : 'http://localhost:9200',
                   'ApplyElasticSearch' : false
                }                 
            }
        );
    });

    it('authservice constructor with authentication disabled', () => {
        configUtils.config().Security.isAutheticationEnabled = 'disabled';
        var authService = new AuthService(<any>UserRepositoryMock);
        expect(authService).not.toBeNull();
    });
    it('authservice constructor with authentication enabled without authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
        var authService = new AuthService(<any>UserRepositoryMock);
        expect(authService).not.toBeNull();
    });
    it('authservice constructor with authentication enabled with authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var authService = new AuthService(<any>UserRepositoryMock);
        expect(authService).not.toBeNull();
    });
    it('authservice authenticate method invoked with authentication disabled', () => {
        configUtils.config().Security.isAutheticationEnabled = 'disabled';
        var authService = new AuthService(<any>UserRepositoryMock);
        authService.authenticate();
    });
    it('authservice authenticate method invoked with authentication enabled without authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
        var authService = new AuthService(<any>UserRepositoryMock);
        authService.authenticate();
    });
    it('authservice authenticate method invoked with authentication enabled with authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var authService = new AuthService(<any>UserRepositoryMock);
        authService.authenticate();
    });
});