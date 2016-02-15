/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories1/userrepository.ts" />

//var Config1 = require('../repos');
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
    function(username, password, done) {
        userrepository.findByName(username).then(
        (user) => {
            
            if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (user._doc.password!=password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
            
        },
        (error) => {return done(error);});
    
    
  }
));

  passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});


passport.deserializeUser(function(id, cb) {
  userrepository.findOne(id).
  then(
      (user)=>
        {
            cb(null, user);
        },
      (err)=>
        {
            return cb(err);
        }
       );
          
    });
    }
    
    

addRoutes() {
        
        router.get('/', function(req, res) {
    // Display the Login page with any flash message, if any
    res.render('home', { message: req.flash('welcome') });
  });
  
  router.get('/login',
  function(req, res){
    res.render('login');
  });
        
        router.post('/login',
        passport.authenticate("local"),(req, res) => {
            res.redirect('/user/' + req.user._id);
        });
        
        router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});
    }  

    
}