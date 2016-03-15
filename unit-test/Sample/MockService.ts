import {service, inject} from '../../decorators';
import {AuthService} from '../../services/auth-service';

export class MockAuthService {

    authenticate() {
        console.log('mock service message');
    }
}