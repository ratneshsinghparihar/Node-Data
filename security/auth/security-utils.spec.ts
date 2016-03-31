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
        spyOn(MetaUtils, 'getMetaData').and.callFake((val) => {
            return { 'params': {'roles':['ROLE_ADMIN']} };
        });
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
        req.user = new UserRepositoryMock().findByField('a','b');
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });
    it('security utils isAuthorize method invoked with authentication enabled without authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithoutAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().findByField('a', 'b');
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });
    it('security utils isAuthorize method invoked with authentication enabled with authorization', () => {
        configUtils.config().Security.isAutheticationEnabled = 'enabledWithAuthorization';
        var req = { 'user': {} };
        req.user = new UserRepositoryMock().findByField('a', 'b');
        securityUtils.isAuthorize(req, new UserRepositoryMock());
    });
});