/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories/userrepository.ts" />

//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository} from './dynamic-repository';
import {SecurityConfig} from '../security-config';
import * as Config from '../config';
var crypto = require('crypto');
import * as Utils from "../decorators/metadata/utils";
//Passport
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var Reflect = require('reflect-metadata');
var jwt = require('jsonwebtoken');
import * as dc from './dynamic-controller';
var router = dc.router;
var userrepository: DynamicRepository;

//Remove this code, move it to utils. Same code present in dynamic-controller.ts
var loggedIn = require('connect-ensure-login').ensureLoggedIn;
var expressJwt = require('express-jwt');


var authenticateByToken = expressJwt({
    secret: SecurityConfig.tokenSecretkey,
    credentialsRequired: true,
    getToken: function fromHeaderOrQuerystring(req) {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.token) {
            return req.query.token;
        } else if (req.cookies && req.cookies.authorization){
            return req.cookies.authorization;
        }
        return null;
    }
});

var ensureLoggedIn = () => {

    //by token
    if (Config.Security.isAutheticationByToken) {
        return authenticateByToken;
    }

    //by password
    if (Config.Security.isAutheticationByUserPasswd) {
        return loggedIn();
    }

    return function (req, res, next) {
        next();
    }
}

if (!Config.Security.isAutheticationEnabled) {
    ensureLoggedIn = () => {
        return function (req, res, next) {
            next();
        }
    }
}

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

        passport.use(new FacebookStrategy({

            // pull in our app id and secret from our Config.ts file
            clientID: Config.facebookAuth.clientID,
            clientSecret: Config.facebookAuth.clientSecret,
            callbackURL: Config.facebookAuth.callbackURL

        },

           // facebook will send back the token and profile
            (token, refreshToken, profile, done) => {
                userrepository.findByField("facebookId", profile.id).then(
                    (user) => {

                        if (!user) {
                            // if there is no user found with that facebook id, create them
                            var newUser = {};
                            // set all of the facebook information in our user model
                            newUser['facebookId'] = profile.id; // set the users facebook id                   
                            newUser['facebookToken'] = token; // we will save the token that facebook provides to the user                    
                            userrepository.post(newUser).then((finalUser) => {
                                return done(null, finalUser);
                            }, (error) => {
                                return done(null, error); 
                            });

                        } else {
                            return done(null, user); // user found, return that user
                        }
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

    private getFullBaseUrl(req): string{
        var fullbaseUr:string="";
         fullbaseUr=req.protocol + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    addRoutes() {
        router.get('/', (req, res) => {
            // Display the Login page with any flash message, if any
            res.render('home', { message: req.flash('welcome') });
        });

        router.get('/data',
            ensureLoggedIn(),
             (req, res) => {
                //fetch all resources name (not the model name) in an array
                var allresourcesNames: Array<string> = Utils.getAllResourceNames();
                var allresourceJson = [];
                var fullbaseUrl: string = "";
                //var originalUrl: string = "";
                //var tokenUrl: string = "";
                //if (req.originalUrl.indexOf('?') === -1) {
                //    originalUrl = req.originalUrl;
                //} else {
                //    var url = req.originalUrl;
                //    originalUrl = url.substr(0, url.indexOf('?')) + "/";
                //    tokenUrl = "?"+ url.substr(url.indexOf('?') + 1);

                //}
                fullbaseUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
                allresourcesNames.forEach(resource => {
                    var resoucejson = {};
                    resoucejson[resource] = fullbaseUrl + resource;//+ tokenUrl;
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

        router.get('/token', (req, res, next) => this.validateRefreshToken(req, res, next),
            (req, res, next) => this.serialize(req, res, next),
            (req, res, next) => this.generateToken(req, res, next),
            (req, res) => this.respond(req, res));

        if (Config.Security.isAutheticationByUserPasswd) {
            router.post('/login',
            passport.authenticate("local"), (req, res) => {
                res.redirect('/'+Config.Config.basePath+'/');
            });
        }
        router.get('/logout', (req, res) => {
            req.logout();
            res.redirect('/');
        });

        // route for facebook authentication and login
        router.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));

        // handle the callback after facebook has authenticated the user
        router.get('/auth/facebook/callback',
            passport.authenticate('facebook'), (req, res) => this.facebookResponse(req, res)
            );

    }

    facebookResponse(req, res) {
        res.cookie('authorization', req.user.facebookToken, { maxAge: 900000, httpOnly: true });
        res.redirect('/data/');
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
        res.cookie('authorization', req.token, { maxAge: 900000, httpOnly: true });
        userrepository.put(req.user.id, req.user);
        next();
    }

    respond(req, res) {
        res.redirect('/data/');
    }

    generateRefreshToken(req, res, next) {
        req.user.refreshToken = req.user.id.toString() + '.' + crypto.randomBytes(40).toString('hex');
        //TODO dont put it in user object in db
        res.cookie('refreshToken', req.user.refreshToken, { maxAge: 900000, httpOnly: true });
        userrepository.put(req.user.id, req.user);
        next();
    }

    validateRefreshToken(req, res, next) {
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