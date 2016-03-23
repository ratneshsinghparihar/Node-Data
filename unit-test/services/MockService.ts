/// <reference path="../../security/auth/auth-service.ts" />
import {AuthService} from '../../security/auth/auth-service';

export class MockAuthService {

    authenticate() {
        console.log('mock service message');
    }
}