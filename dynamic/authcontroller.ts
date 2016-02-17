/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories/userrepository.ts" />

var express = require('express');
import {DynamicRepository} from './dynamic-repository';
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var Reflect = require('reflect-metadata');
import * as dc from './dynamic-controller';
var router = dc.router;
var userrepository: DynamicRepository;

export class AuthController {

    private path: string;

    constructor(path: string, repository: DynamicRepository) {
        userrepository = repository;
        this.path = path;
        this.addRoutes();

        passport.use(new LocalStrategy(
            (username, password, done) => {
                userrepository.findByField('name', username)
                    .then((user) => {
                        if (!user) {
                            return done(null, false, { message: 'Incorrect username.' });
                        }
                        if (user.password != password) {
                            return done(null, false, { message: 'Incorrect password.' });
                        }
                        return done(null, user);

                    }).catch(error => {
                        return done(error);
                    });
            }
        ));

        passport.serializeUser(function (user, cb) {
            cb(null, user._id.toString());
        });

        passport.deserializeUser(function (id, cb) {
            userrepository.findOne(id)
                .then((user) => {
                    cb(null, user);
                }).catch(err => {
                    return cb(err);
                });
        });
    }

    addRoutes() {
        router.get('/', function (req, res) {
            // Display the Login page with any flash message, if any
            res.render('home', { message: req.flash('welcome') });
        });

        router.get('/login',
            function (req, res) {
                res.render('login');
            });

        router.post('/login',
            passport.authenticate("local"), (req, res) => {
                res.redirect('/user/' + req.user._id);
            });

        router.get('/logout', function (req, res) {
            req.logout();
            res.redirect('/');
        });
    }


}