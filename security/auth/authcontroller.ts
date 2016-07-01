/// <reference path="security-utils.ts" />
var express = require('express');
//import UserRepository from '../repositories/userRepository';
import * as configUtil from '../../core/utils';
var crypto = require('crypto');
//Passport
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var jwt = require('jsonwebtoken');
import {router} from '../../core/exports';

import {inject, injectbyname} from '../../di/decorators/inject';

import {Container} from '../../di';
import {AuthService} from './auth-service';
import * as Utils from '../../core/utils';

import * as securityUtils from './security-utils';
import {UserDetailService} from './user-detail-service';

export class AuthController {

    private path: string;

    @inject()
    private authService: AuthService;

    @injectbyname("UserDetailService")
    private userDetailService: UserDetailService;

    constructor(path: string) {
        this.path = path;
        this.addRoutes();
        this.createAuthStrategy();
    }

    private createAuthStrategy() {
        this.authService.authenticate();
    }

    private getFullBaseUrl(req): string {
        var fullbaseUr: string = "";
        fullbaseUr = this.getProtocol(req) + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    private addRoutes() {
        router.get('/',
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                var aa = this.authService;
                // Display the Login page with any flash message, if any
                res.render('home', { user: req.user });
            });

        router.get('/' + configUtil.config().Config.basePath,
            securityUtils.ensureLoggedIn(),
            (req, res) => {
                //fetch all resources name (not the model name) in an array
                var allresourcesNames: Array<string> = Utils.getAllResourceNames();
                var allresourceJson = [];
                var fullbaseUrl: string = "";
                fullbaseUrl = this.getFullBaseUrl(req);
                allresourcesNames.forEach(resource => {
                    var resoucejson = {};
                    resoucejson[resource] = fullbaseUrl + (resource[0] === '/' ? resource : '/' + resource);//+ tokenUrl;
                    allresourceJson.push(resoucejson);
                });
                //loop through rsources and push in json array with name as key and url as value
                res.set("Content-Type", "application/json");

                res.send(JSON.stringify(allresourceJson, null, 4));
            }
        )

        router.get('/login',
            (req, res) => {
                res.render('login');
            });
        router.get('/authlogin',
            (req, res) => {
                res.render('authlogin');
            });
        if (configUtil.config().Security.authenticationType === configUtil.securityConfig().AuthenticationType[configUtil.securityConfig().AuthenticationType.TokenBased]) {
            router.post('/login',
                passport.authenticate("local",
                    {
                        session: false
                    }), (req, res, next) => this.serialize(req, res, next),
                (req, res, next) => this.generateToken(req, res, next),
                (req, res, next) => this.generateRefreshToken(req, res, next),
                (req, res) => this.authRespond(req, res));
        }

        if (configUtil.config().Security.authenticationType === configUtil.securityConfig().AuthenticationType[configUtil.securityConfig().AuthenticationType.TokenBased]) {
            router.post('/authlogin',
                passport.authenticate("local",
                    {
                        session: false
                    }), (req, res, next) => this.serialize(req, res, next),
                (req, res, next) => this.generateToken(req, res, next),
                (req, res, next) => this.generateRefreshToken(req, res, next),
                (req, res) => this.authRespond(req, res));
        }

        router.get('/token', (req, res, next) => this.validateRefreshToken(req, res, next),
            (req, res, next) => this.serialize(req, res, next),
            (req, res, next) => this.generateToken(req, res, next),
            (req, res) => this.authRespond(req, res));

        if (configUtil.config().Security.authenticationType === configUtil.securityConfig().AuthenticationType[configUtil.securityConfig().AuthenticationType.passwordBased]) {
            router.post('/login',
                passport.authenticate("local"), (req, res) => {
                    res.redirect('/' + Utils.config().Config.basePath);
                });
        }
        router.get('/logout', (req, res) => {
            req.logout();
            res.redirect('/');
        });

        router.post('/register', (req, res) => {
            this.userDetailService.getNewUser(req, res);
        });
    }

    serialize(req, res, next) {
        this.db.updateOrCreate(req.user, function (err, user) {
            if (err) { return next(err); }
            // we store the updated information in req.user again
            req.user = {
                id: user._id
            };
            next();
        });
    }

    db = {
        updateOrCreate: function (user, cb) {
            // we just cb the user
            cb(null, user);
        }
    };

    private generateToken(req, res, next) {
        req.token = jwt.sign(
            req.user
            , configUtil.securityConfig().SecurityConfig.tokenSecretkey, {
                expiresInMinutes: configUtil.securityConfig().SecurityConfig.tokenExpiresInMinutes
            });
        //TODO dont put it in user object in db
        req.user.accessToken = req.token;
        res.cookie('authorization', req.token, { maxAge: 900000, httpOnly: true });
        this.userDetailService.updateExistingUser(req.user.id, req.user).then(
            (user) => {
                req.user = user.getUserObject();
                next();
            },
            (error) => {
                return error;
            });
    }

    private respond(req, res) {
        res.redirect('/data/');
    }

    private authRespond(req, res) {
        var responseJson = {};
        delete req.user.password;
        responseJson['user'] = req.user;
        res.send(responseJson);
    }

    private generateRefreshToken(req, res, next) {
        req.user.refreshToken = req.user.id.toString() + '.' + crypto.randomBytes(40).toString('hex');
        //TODO dont put it in user object in db
        res.cookie('refreshToken', req.user.refreshToken, { maxAge: 900000, httpOnly: true });
        this.userDetailService.updateExistingUser(req.user.id, req.user).then(
            (user) => {
                req.user = user.getUserObject();
                next();
            },
            (error) => {
                return error;
            });
    }

    private validateRefreshToken(req, res, next) {
        this.userDetailService.loadUserByField("refreshToken", req.cookies.refreshToken).then(
            (user) => {
                req.user = user.getUserObject();
                next();
            },
            (error) => {
                return error;
            });
    }

    private getProtocol(req) : string{
        if(req.headers && req.headers["x-arr-ssl"]){
            return "https";
        }
        else{
            return req.protocol;
        }
    }
}