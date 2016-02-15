/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories1/userrepository.ts" />

//var Config1 = require('../repos');
var express = require('express');
import {UserRepository} from '../repositories1/userrepository';
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var Reflect = require('reflect-metadata');
export var router = express.Router();


export class AuthController {
    private userrepository: UserRepository;
    private path: string;

    constructor(path: string, repository: UserRepository) {
        this.userrepository = repository;
        this.path = path;
        this.addRoutes();       
        
         passport.use(this.localStrategy);
         
         passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  this.userrepository.findById(id, function(err, user) {
    done(err, user);
  });
});
    }

    private localStrategy=
    new LocalStrategy(
  function(username, password, done) {
    this.userrepository.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (user._doc.password!=password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
)

    addRoutes() {
        router.post(this.path+"/login",
        passport.authenticate("local"),(req, res) => {
            res.redirect('/user/' + req.user._id);
        });
    }    


   

    
}