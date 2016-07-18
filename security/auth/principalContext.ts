var domain = require('./domain');

export class PrincipalContext {
    static get User(): any {
        return domain.get('context:user');
    }

    static set User(user: any) {
        domain.set('context:user', user);
    }

    static save(key: string, value: any) {
        if (!key)
            throw 'invalid key';
        domain.set('context:' + key.trim(), value);
    }

    static get(key: string) {
        return domain.get('context:' + key.trim());
    }
}