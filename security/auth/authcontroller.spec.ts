import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
import {Container} from '../../di';
import {AuthService} from './auth-service';
import * as securityUtils from './security-utils';
import * as Utils from '../../core/utils';

describe('AuthControllerFunc', () => {

    beforeEach(() => {
        spyOn(securityUtils, 'ensureLoggedIn').and.callFake(() =>
        {
            return function (req, res, next) {
                next();
            }
        });
        spyOn(Utils, 'config').and.returnValue(
            {
                'Security': {
                    'isAutheticationEnabled': 'disabled',
                    'authenticationType': 'passwordBased'
                },
                'facebookAuth': {
                    'clientID': '11',
                    'clientSecret': 'aa',
                    'callbackURL': 'http://localhost:23548/auth/facebook/callback'
                }
            }
        );
    });

    it('authController constructor', () => {
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(authController).not.toBeNull();
    });

});