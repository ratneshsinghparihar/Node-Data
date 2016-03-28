import {inject, service} from '../di/decorators';
import {ServiceA} from './service-a';
import UserRepository from './repositories/userRepository';
import BlogRepository from './repositories/blogrepository';

@service()
export class ServiceB {
    constructor(@inject() a: ServiceA, @inject() ur: UserRepository, @inject() br: BlogRepository) {
    }
}