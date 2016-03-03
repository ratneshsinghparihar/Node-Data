require('reflect-metadata/reflect');
//require('harmonize')(['harmony_default_parameters']);
var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;

//import * as rolerepo from './repositories/rolerepository';
import Dynamic = require('./dynamic/dynamic');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());

//var u = new UserRepository();
//var r = new RoleRepository();

var d = new Dynamic.repo();
//controllers.init(app);
var expressSession = require('express-session');
app.use(expressSession({secret: 'mySecretKey', resave: false, saveUninitialized: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
})); 

app.use(passport.initialize());
app.use(passport.session());

//import controllers = require("./controllers");

//import ApiGenerator =require("./models/decorator");
//ApiGenerator.init(app);
//controllers.init(app);
app.use("/", Dynamic.dynamicRouter);

var server = http.createServer(app);

import {Container} from './di';
import {UserRoleService} from './services/userrole-service';
import {ESuccess as ESuccess} from './services/di-service-test-success';
import {E as EFail} from './services/di-service-test-fail';

console.log('Success:');
//var aa = Container.resolve<ESuccess>(ESuccess);
console.log('Fail:');
//var bb = Container.resolve<EFail>(EFail);
        //var aa = Container.resolve<UserRoleService>(UserRoleService);
        //aa.getOne();
        //aa.getAll();

server.listen(23548);
