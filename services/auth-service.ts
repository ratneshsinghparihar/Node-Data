/// <reference path="../dynamic/dynamic-repository.ts" />
/// <reference path="../dynamic/dynamic-controller.ts" />
import Config = require("../config");
import {Container} from '../di';
import {UserService} from './user-service';
import {service} from '../decorators/service';
import {inject} from '../decorators/inject';

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

import {DynamicRepository} from '../dynamic/dynamic-repository';

var userrepository: DynamicRepository;

import * as dc from '../dynamic/dynamic-controller';
var router = dc.router;

export class AuthService {

    constructor(repository: DynamicRepository) {
        userrepository = repository;
        this.addRoutes();
    }

    authenticate() {
        this.authenticateByPasswordorToken();
        this.facebookAuthentication();
    }

    private authenticateByPasswordorToken() {
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
            this.serializeDeserialize();

          
    }

    private serializeDeserialize() {
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

    private facebookAuthentication() {
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
        this.serializeDeserialize();
    }

    private addRoutes() {
        // route for facebook authentication and login
        router.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));

        // handle the callback after facebook has authenticated the user
        router.get('/auth/facebook/callback',
            passport.authenticate('facebook'), (req, res) => this.facebookResponse(req, res)
        );

    }

    private facebookResponse(req, res) {
        res.cookie('authorization', req.user.facebookToken, { maxAge: 900000, httpOnly: true });
        res.redirect('/data/');
    }
}