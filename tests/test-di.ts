import {inject, service} from '../di/decorators';
import {ServiceB} from './service-b';

export class TestDI{
    @inject()
    public b: ServiceB;
}