/// <reference path="../services/auth-service.ts" />
/// <reference path="../decorators/inject.ts" />
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories/userrepository.ts" />

//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository} from './dynamic-repository';
import * as SecurityConfig from '../security-config';
import * as Config from '../config';
var crypto = require('crypto');
import * as Utils from "../decorators/metadata/utils";
//Passport
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var jwt = require('jsonwebtoken');
import * as dc from './dynamic-controller';
var router = dc.router;
var userrepository: DynamicRepository;

import {inject} from '../decorators/inject';

import {Container} from '../di';
import {AuthService} from '../services/auth-service';

export class AuthController {

    private path: string;

    @inject()
    public authService: AuthService;

    constructor(path: string, repository: DynamicRepository) {
        userrepository = repository;
        this.path = path;
        this.addRoutes();
    }

    public createAuthStrategy() {
        this.authService.authenticate();
    }

    private getFullBaseUrl(req): string{
        var fullbaseUr:string="";
         fullbaseUr=req.protocol + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

   private addRoutes() {
        router.get('/',
            Utils.ensureLoggedIn(),
            (req, res) => {
                var aa = this.authService;
            // Display the Login page with any flash message, if any
                res.render('home', {user: req.user});
        });

        router.get('/data',
            Utils.ensureLoggedIn(),
             (req, res) => {
                //fetch all resources name (not the model name) in an array
                var allresourcesNames: Array<string> = Utils.getAllResourceNames();
                var allresourceJson = [];
                var fullbaseUrl: string = "";
                fullbaseUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
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

        if (Config.Security.authenticationType === SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.TokenBased]) {
            router.post('/login',
                passport.authenticate("local",
                    {
                        session: false
                    }), (req, res, next) => this.serialize(req, res, next),
                (req, res, next) => this.generateToken(req, res, next),
                (req, res, next) => this.generateRefreshToken(req, res, next),
                (req, res) => this.respond(req, res));
        }

        router.get('/token', (req, res, next) => this.validateRefreshToken(req, res, next),
            (req, res, next) => this.serialize(req, res, next),
            (req, res, next) => this.generateToken(req, res, next),
            (req, res) => this.respond(req, res));

        if (Config.Security.authenticationType === SecurityConfig.AuthenticationType[SecurityConfig.AuthenticationType.passwordBased]) {
            router.post('/login',
            passport.authenticate("local"), (req, res) => {
                res.redirect('/'+Config.Config.basePath);
            });
        }
        router.get('/logout', (req, res) => {
            req.logout();
            res.redirect('/');
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
        req.token = jwt.sign({
            id: req.user.id,
        }, SecurityConfig.SecurityConfig.tokenSecretkey, {
                expiresInMinutes: SecurityConfig.SecurityConfig.tokenExpiresInMinutes
            });
        //TODO dont put it in user object in db
        req.user.accessToken = req.token;
        res.cookie('authorization', req.token, { maxAge: 900000, httpOnly: true });
        userrepository.put(req.user.id, req.user);
        next();
    }

   private respond(req, res) {
        res.redirect('/data/');
    }

   private  generateRefreshToken(req, res, next) {
        req.user.refreshToken = req.user.id.toString() + '.' + crypto.randomBytes(40).toString('hex');
        //TODO dont put it in user object in db
        res.cookie('refreshToken', req.user.refreshToken, { maxAge: 900000, httpOnly: true });
        userrepository.put(req.user.id, req.user);
        next();
    }

   private validateRefreshToken(req, res, next) {
        userrepository.findByField("refreshToken", req.cookies.refreshToken).then(
            (user) => {
                req.user = user;
                next();
            },
            (error) => {
                return error;
            });
}
}