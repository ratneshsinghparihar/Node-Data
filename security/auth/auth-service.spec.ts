/// <reference path="../../unit-test/repository/user-repository-mock.ts" />
/// <reference path="../../di/di.ts" />
/// <reference path="auth-service.ts" />
/// <reference path="../../unit-test/services/MockService.ts" />

import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
import {Container} from '../../di/di';
import {AuthService} from './auth-service';
import {MockAuthService} from '../../unit-test/services/MockService';

describe('AuthServiceFunc', () => {
    beforeEach(() => {
        spyOn(AuthService.prototype, 'addRoutes');
    });

    it('authservice constructor', () => {
        var authService = new AuthService(<any>UserRepositoryMock);
        expect(authService).not.toBeNull();
    });
});