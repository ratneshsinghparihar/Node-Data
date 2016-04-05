import * as Utils from '../../core/utils';
require('reflect-metadata/reflect');
import {AuthController} from './authcontroller';
import {UserRepositoryMock} from '../../unit-test/repository/user-repository-mock';
import {Container} from '../../di/di';
import {AuthService} from './auth-service';
import {MockAuthService} from '../../unit-test/services/MockService';
import * as securityUtils from './security-utils';
import * as configUtils from '../../core/utils';
import {MetaUtils} from "../../core/metadata/utils";

describe('SecurityUtilsFunc', () => {
    beforeEach(() => {
        spyOn(configUtils, 'config').and.returnValue(
            {
                'Security': {
                    'isAutheticationEnabled': 'enabledWithoutAuthorization',
                    'authenticationType': 'passwordBased'
                },
                'facebookAuth': {
                    'clientID': '11',
                    'clientSecret': 'aa',
                    'callbackURL': 'http://localhost:23548/auth/facebook/callback'
                },
                'Config': {
                    'DbConnection': 'mongodb://localhost:27017/userDatabase',
                    'basePath': 'data',
                    'apiversion': "v1",
                    'ElasticSearchConnection': 'http://localhost:9200',
                    'ApplyElasticSearch': false
                }
            }
        );
       
    });

    it('security utils ensuredLoggin method invoked  with authentication disabled', () => {
        configUtils.config().Security.isAutheticationEnabled = 'disabled';
        securityUtils.ensureLoggedIn();
    });
    it('security utils ensuredLoggin method invoked  with authentication enabled without authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
        securityUtils.ensureLoggedIn();
    });
    it('security utils ensuredLoggin method invoked  with authentication enabled with authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        securityUtils.ensureLoggedIn();
    });
    it('security utils isAuthorize method invoked with authentication disabled', () => {
        configUtils.config().Security.isAutheticationEnabled = 'disabled';
        var req = { 'user': {}};
        req.user = new UserRepositoryMock().getUser();
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });
    it('security utils isAuthorize method invoked with authentication enabled without authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });
    it('security utils isAuthorize method invoked with authentication enabled with authorization', () => {
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': { 'roles': ['ROLE_ADMIN'] } };
        });
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });

    it('security utils isAuthorize method invoked with authentication enabled with authorization and different user roles', () => {
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': { 'roles': ['ROLE_ABC'] } };
        });
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });

    it('security utils isAuthorize method invoked with authentication enabled with authorization and currentuser roles null', () => {
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': { 'roles': ['ROLE_ADMIN'] } };
        });
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        req.user['roles'] = "";
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });

    it('security utils isAuthorize method invoked with authentication enabled with authorization with resource name blogs', () => {
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': { } };
        });
        spyOn(Utils, 'getResourceNameFromModel').and.callFake((val) => {
            return  'blogs' ;
        });
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });

    it('security utils isAuthorize method invoked with authentication enabled without rolenames', () => {
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': {} };
        });
        spyOn(Utils, 'getResourceNameFromModel').and.callFake((val) => {
            return 'blogs';
        });
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        req.user['rolenames'] = "";
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });

    it('security utils isAuthorize method invoked with authentication enabled with no resource names', () => {
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': {} };
        });
        spyOn(Utils, 'getResourceNameFromModel').and.callFake((val) => {
            return '';
        });
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().getUser();
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });
});