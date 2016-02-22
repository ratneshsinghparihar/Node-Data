var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
require('reflect-metadata/Reflect');

//import * as rolerepo from './repositories/rolerepository';
var Dynamic = require('./dynamic/dynamic');

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

server.listen(23548);
