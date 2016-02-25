/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories1/userrepository.ts" />

//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository} from './dynamic-repository';
import {SecurityConfig} from '../security-config';
var Config = require('../config');
var crypto = require('crypto');
import * as Utils from "../decorators/metadata/utils";
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var Reflect = require('reflect-metadata');
var jwt = require('jsonwebtoken');
import * as dc from './dynamic-controller';
var router = dc.router;
var userrepository: DynamicRepository;

export class AuthController {

    private path: string;

    constructor(path: string, repository: DynamicRepository) {
        userrepository = repository;
        this.path = path;
        this.addRoutes();


        if (Config.Security.isAutheticationByToken) {
            passport.use(new LocalStrategy(
                (username, password, done) => {
                    userrepository.findByField("name", username).then(
                        (user) => {

                            if (!user) {
                                return done(null, false, { message: 'Incorrect username.' });
                            }
                            if (user.password != password) {
                                return done(null, false, { message: 'Incorrect password.' });
                            }

                            return done(null, user);

                        },
                        (error) => {
                            return done(error);
                        });

                }

            ));
        }


        if (Config.Security.isAutheticationByUserPasswd) {
            passport.use(new LocalStrategy(
                (username, password, done) => {
                    userrepository.findByField("name", username).then(
                        (user) => {

                            if (!user) {
                                return done(null, false, { message: 'Incorrect username.' });
                            }
                            if (user.password != password) {
                                return done(null, false, { message: 'Incorrect password.' });
                            }

                            return done(null, user);

                        },
                        (error) => {
                            return done(error);
                        });

                }

            ));


            passport.serializeUser((user, cb) => {
                cb(null, user._id);
            });


            passport.deserializeUser((id, cb) => {
                userrepository.findOne(id).
                    then(
                    (user) => {
                        cb(null, user);
                    },
                    (err) => {
                        return cb(err);
                    }
                    );

            });
        }
    }


    addRoutes() {
        router.get('/', (req, res) => {
            // Display the Login page with any flash message, if any
            res.render('home', { message: req.flash('welcome') });
        });

        router.get('/data',
            require('connect-ensure-login').ensureLoggedIn(), (req, res) => {
                //fetch all resources name (not the model name) in an array
                var allresourcesNames: Array<string> = Utils.getAllResourceNames();
                var allresourceJson = [];
                allresourcesNames.forEach(resource => {
                    var resoucejson = {};
                    resoucejson[resource] = "/data/" + resource + "/";
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

        if (Config.Security.isAutheticationByToken) {
            router.post('/login',
                passport.authenticate("local",
                    {
                        session: false
                    }), (req, res, next) => this.serialize(req, res, next),
                (req, res, next) => this.generateToken(req, res, next),
                (req, res, next) => this.generateRefreshToken(req, res, next),
                (req, res) => this.respond(req, res));
        }

        router.post('/token', (req, res, next) => this.validateRefreshToken(req, res, next),
            (req, res, next) => this.serialize(req, res, next),
            (req, res, next) => this.generateToken(req, res, next),
            function (req, res) {
                res.status(201).json({
                    token: req.token
                });
            });

        if (Config.Security.isAutheticationByUserPasswd) {
            router.post('/login',
                passport.authenticate("local"), (req, res) => {
                    res.redirect('/user/' + req.user._id);
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

    generateToken(req, res, next) {
        req.token = jwt.sign({
            id: req.user.id,
        }, SecurityConfig.tokenSecretkey, {
                expiresInMinutes: SecurityConfig.tokenExpiresInMinutes
            });
        //TODO dont put it in user object in db
        req.user.accessToken = req.token;
        userrepository.put(req.user.id, req.user);
        next();
    }

    respond(req, res) {
        res.redirect('/user?token=' + req.token);
    }

    generateRefreshToken(req, res, next) {
        req.user.refreshToken = req.user.id.toString() + '.' + crypto.randomBytes(40).toString('hex');
        //TODO dont put it in user object in db
        userrepository.put(req.user.id, req.user);
        next();
    }

    validateRefreshToken(req, res, next) {
        userrepository.findByField("refreshToken", req.query.refreshToken).then(
            (user) => {
                req.user = user;
                next();
            },
            (error) => {
                return error;
            });
}
}