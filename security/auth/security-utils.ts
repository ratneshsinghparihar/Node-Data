var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');
import * as SecurityConfig from '../../security-config';
import * as configUtils from '../../core/utils';
import {MetaUtils} from "../../core/metadata/utils";
import * as Utils from '../../core/utils';
import {Decorators} from '../../core/constants/decorators';

import * as securityImplCore from '../../core/dynamic/security-impl';

var authenticateByToken = expressJwt({
    secret: SecurityConfig.SecurityConfig.tokenSecretkey,
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
securityImplCore.ensureLoggedIn = ensureLoggedIn;
securityImplCore.isAuthorize = isAuthorize;

export function ensureLoggedIn() {
    if (configUtils.config().Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.disabled]) {
        return function (req, res, next) {
            next();
        }
    }

    //by token
    if (configUtils.config().Security.authenticationType == SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.TokenBased]) {
        return authenticateByToken;
    }

    //by password
    if (configUtils.config().Security.authenticationType == SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.passwordBased]) {
        return loggedIn();
    }

    return function (req, res, next) {
        next();
    }
}

export function isAuthorize(req: any, repository: any, invokedFunction?: string): boolean {
    if (configUtils.config().Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.disabled] || configUtils.config().Security.isAutheticationEnabled == SecurityConfig.AuthenticationEnabled[SecurityConfig.AuthenticationEnabled.enabledWithoutAuthorization]) {
        return true;
    }
    var metadata = MetaUtils.getMetaData(repository.getModelRepo(), Decorators.AUTHORIZE, invokedFunction);
    var param = metadata && <any>metadata.params;
    if (param && param.roles) {
        var currentUser = req.user;
        if (currentUser && currentUser.roles && currentUser.roles != "" && currentUser.roles.length > 0) {
            var isRolePresent = Enumerable.from(param.roles)
                .select(role => this.presentInArray(role, currentUser.roles) == true)
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
    var resourceName = Utils.getResourceNameFromModel(this.repository.getEntityType())
    //2. get auth config from security config
    var authCofig = Enumerable.from(SecurityConfig.SecurityConfig.ResourceAccess)
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
