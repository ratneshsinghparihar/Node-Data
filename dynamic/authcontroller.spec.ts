/// <reference path="../unit-test/repository/user-repository-mock.ts" />

import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../unit-test/repository/user-repository-mock';
import {Container} from '../di';
import {AuthService} from '../services/auth-service';
import {MockAuthService} from '../unit-test/services/MockService';

describe('AuthControllerFunc', () => {
    var mock: MockAuthService = new MockAuthService();

    beforeEach(() => {
        spyOn(Container, 'resolve').and.callFake((val) => {
            switch (val) {
                case AuthService:
                    return mock;
            }
        });
        spyOn(mock, 'authenticate').and.callThrough();
    });

    it('authController constructor', () => {
        var authController = new AuthController("/", <any>UserRepositoryMock);
        expect(authController).not.toBeNull();
    });

    it('authController: createAuthStrategy', () => {
        var authController = new AuthController("/", <any>UserRepositoryMock);
        authController.createAuthStrategy();
        expect(mock.authenticate).toHaveBeenCalled();
    });

});