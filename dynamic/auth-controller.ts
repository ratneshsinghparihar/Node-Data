/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../repositories1/userrepository.ts" />

//var Config1 = require('../repos');
var express = require('express');
import UserRepository from '../repositories1/userrepository';
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var Reflect = require('reflect-metadata');
import * as dc from './dynamic-controller';
var router = dc.router;


export class AuthController {
    private userrepository: UserRepository;
    private path: string;

    constructor(path: string, repository: UserRepository) {
        this.userrepository = repository;
        this.path = path;
        this.addRoutes();
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