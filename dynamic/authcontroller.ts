/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories/userrepository.ts" />

//var Config1 = require('../repos');
var express = require('express');
import {DynamicRepository} from './dynamic-repository';
import {SecurityConfig} from '../security-config';
import * as Config from '../config';
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
            var JwtStrategy = require('passport-jwt').Strategy,
                ExtractJwt = require('passport-jwt').ExtractJwt;
            var opts = {}
            opts["jwtFromRequest"] = ExtractJwt.fromAuthHeader();
            opts["secretOrKey"] = SecurityConfig.secretkey;
            opts["issuer"] = SecurityConfig.issuer;
            opts["audience"] = SecurityConfig.audience;
            passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
                this.userrepository.findOne({ id: jwt_payload.sub }, function(err, user) {
                    if (err) {
                        return done(err, false);
                    }
                    if (user) {
                        done(null, user);
                    } else {
                        done(null, false);
                        // or you could create a new account
                    }
                });
            }));
        }


        if (Config.Security.isAutheticationByUserPasswd) {
            passport.use(new LocalStrategy(
                function(username, password, done) {
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


            passport.serializeUser(function(user, cb) {
                cb(null, user._id);
            });


            passport.deserializeUser(function(id, cb) {
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

    private getFullBaseUrl(req): string{
        var fullbaseUr:string="";
         fullbaseUr=req.protocol + '://' + req.get('host') + req.originalUrl;
        return fullbaseUr;
    }

    addRoutes() {

        router.get('/', function(req, res) {
            // Display the Login page with any flash message, if any
            res.render('home', { message: req.flash('welcome') });
        });

        router.get('/'+Config.Config.basePath ,
            require('connect-ensure-login').ensureLoggedIn(), function(req, res) {
                //fetch all resources name (not the model name) in an array
                var allresourcesNames: Array<string> = Utils.getAllResourceNames();
                var allresourceJson = [];
                var fullbaseUr:string="";
                fullbaseUr=req.protocol + '://' + req.get('host') + req.originalUrl;
                allresourcesNames.forEach(resource => {
                    var resoucejson = {};
                    resoucejson[resource] = fullbaseUr +"/" + resource ;
                    allresourceJson.push(resoucejson);
                });
                //loop through rsources and push in json array with name as key and url as value
                res.set("Content-Type", "application/json");

                res.send(JSON.stringify(allresourceJson, null, 4));
            }
        )

        router.get('/login',
            function(req, res) {
                res.render('login');
            });

        router.post('/login',
            passport.authenticate("local"), (req, res) => {
                res.redirect('/'+Config.Config.basePath+'/');
            });

        router.get('/logout', function(req, res) {
            req.logout();
            res.redirect('/');
        });
    }


}