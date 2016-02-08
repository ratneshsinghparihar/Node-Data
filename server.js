var http = require("http");
var express = require("express");
var bodyParser = require("body-parser");
require('reflect-metadata/Reflect');
//import * as rolerepo from './repositories/rolerepository';
var Dynamic = require('./dynamic/dynamic');
var app = express();
//var u = new UserRepository();
//var r = new RoleRepository();
var d = new Dynamic.repo();
//controllers.init(app);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
//import controllers = require("./controllers");
//import ApiGenerator =require("./models/decorator");
//ApiGenerator.init(app);
//controllers.init(app);
app.use("/", Dynamic.dynamicRouter);
var server = http.createServer(app);
server.listen(23548);
