var domain = require('./domain');

export class PrincipalContext {
    static get User(): any {
        return domain.get('context:user');
    }
    static set User(user: any) {
        domain.set('context:user', user);
    }
}