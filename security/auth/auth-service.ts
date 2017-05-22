import * as configUtil from '../../core/utils';

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
import {service} from '../../di/decorators/service';

import {DynamicRepository} from '../../core/dynamic/dynamic-repository';
import {inject, injectbyname} from '../../di/decorators/inject';
import UserRepository from '../../tests/repositories/userRepository';
import {UserDetailService} from './user-detail-service';
import {router} from '../../core/exports';
var bcryptNodejs = require("bcrypt-nodejs");

@service()
export class AuthService {

    @injectbyname("UserDetailService")
    private userDetailService: UserDetailService;

    constructor() {
        if (configUtil.config().Security.useFaceBookAuth == true) {
            this.addRoutes();
        }
    }

    authenticate() {
        this.authenticateByPasswordorToken();
        if (configUtil.config().Security.useFaceBookAuth == true) {
            this.facebookAuthentication();
        }
    }

    private authenticateByPasswordorToken() {
        passport.use(new LocalStrategy(
            (username, password, done) => {
                this.userDetailService.loadUserByUsername(username).then(
                    (user) => {
                        if (!user) {
                            return done(null, false, { message: 'Incorrect username.' });
                        }
                        if (!bcryptNodejs.compareSync(password, user.getPassword())) {
                            return done(null, false, { message: 'Incorrect password.' });
                        }

                        return done(null, user.getUserObject());

                    },
                    (error) => {
                        return done(error);
                    });

            }

        ));
        // this.serializeDeserialize();


    }

    private serializeDeserialize() {
        passport.serializeUser((user, cb) => {
            cb(null, user._id);
        });


        passport.deserializeUser((id, cb) => {
            this.userDetailService.loadUserById(id).
                then(
                (user) => {
                    cb(null, user.getUserObject());
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
            clientID: configUtil.config().facebookAuth.clientID,
            clientSecret: configUtil.config().facebookAuth.clientSecret,
            callbackURL: configUtil.config().facebookAuth.callbackURL

        },

            // facebook will send back the token and profile
            (token, refreshToken, profile, done) => {
                this.userDetailService.loadUserByField("facebookId", profile.id).then(
                    (user) => {

                        if (!user) {
                            // if there is no user found with that facebook id, create them
                            var newUser = {};
                            // set all of the facebook information in our user model
                            newUser['facebookId'] = profile.id; // set the users facebook id                   
                            newUser['facebookToken'] = token; // we will save the token that facebook provides to the user  
                            this.userDetailService.createNewUser(newUser).then((finalUser) => {
                                return done(null, finalUser.getUserObject());
                            }, (error) => {
                                return done(null, error);
                            });

                        } else {
                            return done(null, user.getUserObject()); // user found, return that user
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
        this.facebookAuthentication();
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