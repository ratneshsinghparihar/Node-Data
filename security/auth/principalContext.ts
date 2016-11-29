﻿var domain = require('./domain');
//var cls = require('continuation-local-storage');

export class PrincipalContext {
    //private static session;
    //static getSession() {
    //    if (!PrincipalContext.session) {
    //        PrincipalContext.session = cls.getNamespace('session');
    //    }
    //    return PrincipalContext.session;
    //}
    static get User(): any {
        return domain.get('context:user');
        //return PrincipalContext.getSession().get('user');
    }

    static set User(user: any) {
        domain.set('context:user', user);
        //PrincipalContext.getSession().set('user', user);
    }

    static save(key: string, value: any) {
        if (!key)
            throw 'invalid key';
        domain.set('context:' + key.trim(), value);
        //PrincipalContext.getSession().set(key, value);
    }

    static get(key: string) {
        return domain.get('context:' + key.trim());
        //return PrincipalContext.getSession().get(key);
    }
}