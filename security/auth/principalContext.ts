﻿var domain = require('./domain');
var cls = require('continuation-local-storage');

export class PrincipalContext {
    private static session: any;

    static getSession() {
        if (PrincipalContext.session != null && PrincipalContext.session != 'undefined') {
            //cls = require('continuation-local-storage').getNamespace;
            PrincipalContext.session = cls.getNamespace('session');
        } else {
            console.log('creating session from principal context');
            //cls = require('continuation-local-storage').createNamespace;
            PrincipalContext.session = cls.createNamespace('session');
        }
        return PrincipalContext.session;
    }

    static get User(): any {
        return domain.get('context:user');
        //return PrincipalContext.getSession().get('user');
    }

    static set User(user: any) {
        domain.set('context:user', user);
        PrincipalContext.setKeys('user');
        //PrincipalContext.getSession().set('user', user);
    }

    static save(key: string, value: any): any {
        if (!key)
            throw 'invalid key';
        domain.set('context:' + key.trim(), value);
        PrincipalContext.setKeys(key);
        //PrincipalContext.getSession().set(key, value);
    }

    static get(key: string) {
        return domain.get('context:' + key.trim());
        //return PrincipalContext.getSession().get(key);
    }

    private static setKeys(key: String) {
        var keys: Array<any> = domain.get('context:_keys');
        //var keys :Array<any> = PrincipalContext.getSession().get('_keys');
        if (keys == null) {
            domain.set('context:_keys', [key]);
            //PrincipalContext.getSession().set('_keys',[key]);
        }
        else {
            if (keys.indexOf(key) < 0) {
                keys.push(key);
                domain.set('context:_keys', keys);
                //PrincipalContext.getSession().set('_keys',keys);
            }
        }
        //console.log("context: "+ JSON.stringify(PrincipalContext.getSession()));
    }

    static getAllKeys() {
        return domain.get('context:_keys');
        //return PrincipalContext.getSession().get('_keys');
    }

    static getAllKeyValues(): any {
        var keys: Array<any> = PrincipalContext.getAllKeys();
        var ret = {};
        keys.forEach(x => {
            var val = PrincipalContext.get(x);
            if (x && val) {
                try {
                    val = JSON.parse(val);
                }
                catch (e) {
                }
                ret[x] = val;
            }
        });
        return ret;
    }
}