var cls = require('continuation-local-storage');

export class PrincipalContext {
    private static session;
    static getSession() {
        if (!PrincipalContext.session) {
            PrincipalContext.session = cls.getNamespace('session');
        }
        return PrincipalContext.session;
    }
    static get User(): any {

        return PrincipalContext.getSession().get('user');
    }

    static set User(user: any) {
        PrincipalContext.getSession().set('user', user);
    }

    static save(key: string, value: any) {
        if (!key)
            throw 'invalid key';
        PrincipalContext.getSession().set(key, value);
    }

    static get(key: string) {
        return PrincipalContext.getSession().get(key);
    }
}