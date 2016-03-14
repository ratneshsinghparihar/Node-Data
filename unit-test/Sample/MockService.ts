import {service, inject} from '../../decorators';
import {AuthService} from '../../services/auth-service';

@service({ test: true, injectedType: AuthService })
export class MockAuthService {

    authenticate() {
        console.log('mock service message');
    }
}