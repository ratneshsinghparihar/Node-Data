import {service, inject} from '../../decorators';
import {AuthService} from '../../services/auth-service';
import {Container} from '../../di';

export function registerMockServices() {
    var mock = new MockAuthService();
}

@service({ test: true, injectedType: AuthService })
export class MockAuthService {

    authenticate() {
        console.log('mock service message');
    }
}