var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');
import * as SecurityConfig from '../../security-config';
import * as configUtils from '../../core/utils';

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
