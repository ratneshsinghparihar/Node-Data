import * as Enumerable from 'linq';
var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');
import * as configUtils from '../../core/utils';
import {MetaUtils} from "../../core/metadata/utils";
import * as Utils from '../../core/utils';
import {Decorators} from '../../core/constants/decorators';

import * as securityImplCore from '../../core/dynamic/security-impl';

(<any>securityImplCore).ensureLoggedIn = ensureLoggedIn;
(<any>securityImplCore).isAuthorize = isAuthorize;

export function expressJwtFunc() {
    return expressJwt({
        secret: configUtils.securityConfig().SecurityConfig.tokenSecretkey,
        credentialsRequired: true,
        getToken: function fromHeaderOrQuerystring(req) {
            if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
                return req.headers.authorization.split(' ')[1];
            } else if (req.query && req.query.token) {
                return req.query.token;
            } else if (req.cookies && req.cookies.authorization) {
                return req.cookies.authorization;
            }
            return null;
        }
    });
}

export function ensureLoggedIn() {
    if (configUtils.config().Security.isAutheticationEnabled == configUtils.securityConfig().AuthenticationEnabled[configUtils.securityConfig().AuthenticationEnabled.disabled]) {
        return function (req, res, next) {
            next();
        }
    }

    //by token
    if (configUtils.config().Security.authenticationType == configUtils.securityConfig().AuthenticationType[configUtils.securityConfig().AuthenticationType.TokenBased]) {
        return expressJwtFunc();
    }

    //by password
    if (configUtils.config().Security.authenticationType == configUtils.securityConfig().AuthenticationType[configUtils.securityConfig().AuthenticationType.passwordBased]) {
        return loggedIn();
    }

    return function (req, res, next) {
        next();
    }
}

export function isAuthorize(req: any, repository: any, invokedFunction?: string): boolean {
    if (configUtils.config().Security.isAutheticationEnabled == configUtils.securityConfig().AuthenticationEnabled[configUtils.securityConfig().AuthenticationEnabled.disabled] || configUtils.config().Security.isAutheticationEnabled == configUtils.securityConfig().AuthenticationEnabled[configUtils.securityConfig().AuthenticationEnabled.enabledWithoutAuthorization]) {
        return true;
    }
    var metadata = MetaUtils.getMetaData(repository.getEntityType(), Decorators.AUTHORIZE, invokedFunction);
    var param = metadata && <any>metadata.params;
    if (param && param.roles) {
        var currentUser = req.user;
        if (currentUser && currentUser.roles && currentUser.roles != "" && currentUser.roles.length > 0) {
            var isRolePresent = Enumerable.from(param.roles)
                .select(role => {
                    var isAvailable = Enumerable.from(currentUser.roles)
                        .where((roleUser: any) => roleUser.name == role)
                        .firstOrDefault(null);
                    if (isAvailable) {
                        return true;
                    } else {
                        return false;
                    }

                })
                .firstOrDefault(null);
            if (isRolePresent) {
                return true;
            }
        }
        return false;
    }
    var isAutherize: boolean = false;
    //check for autherization
    //1. get resource name         
    var resourceName = Utils.getResourceNameFromModel(repository.getEntityType())
    //2. get auth config from security config
    var authCofig:any = Enumerable.from(configUtils.securityConfig().SecurityConfig.ResourceAccess)
        .where((resourceAccess: any) => { return resourceAccess.name == resourceName; })
        .firstOrDefault();
    //if none found then carry on                                     
    if (authCofig) {

        //3. get user object in session
        var userInsession = req.user;
        //4. get roles for current user

        if (!userInsession.rolenames) return false;

        var userRoles: string = userInsession.rolenames;

        var rolesForRead: Array<any> = Enumerable.from(authCofig.acl)
            .where((acl: any) => { return (acl.accessmask & 1) == 1; })
            .toArray();
        //5 match auth config and user roles 
        rolesForRead.forEach(element => {
            if (userRoles.indexOf(element.role) >= 0) {
                isAutherize = true;
            }


        });
        return isAutherize;
    }

    return true;
}


