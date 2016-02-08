/// <reference path="../typings/mongoose/mongoose.d.ts" />
/// <reference path="../typings/node/node.d.ts" />
var Mongoose = require("mongoose");
var Config = require('../config');
//var Config = require('../repos');
var schema = Mongoose.Schema;
var http = require("http");
var express = require("express");
var router = express.Router();
var bodyParser = require("body-parser");
var Reflect = require('reflect-metadata/Reflect');
Mongoose.connect(Config.DbConnection);
var repoList = {};
var DynamicRepository1 = (function () {
    function DynamicRepository1(path1, fn, schema) {
        this.path = path1;
        var modelName = this.path.substring(1);
        this.entityType = fn;
        //this.metaModel=new this.entityType();
        repoList[this.path] = repoList[this.path] || Mongoose.model(path1, schema || new schema({}, { strict: false }));
        this.model = repoList[this.path];
    }
    DynamicRepository1.prototype.modelName = function () {
        return this.model.modelName;
    };
    DynamicRepository1.prototype.getEntityType = function () {
        return this.entityType;
    };
    DynamicRepository1.prototype.findAll = function () {
        return this.model.find();
    };
    DynamicRepository1.prototype.findOne = function (id) {
        return this.model.findOne({ '_id': id });
    };
    DynamicRepository1.prototype.findChild = function (id, prop) {
        return this.model.findOne({ '_id': id });
    };
    DynamicRepository1.prototype.post = function (obj) {
        return (new this.model(obj)).save();
    };
    DynamicRepository1.prototype.put = function (id, obj) {
        return this.model.update({ '_id': id }, obj, { upsert: true });
        //return this.delete(id)
        //    .then(result => {
        //        return this.post(obj);
        //    });
    };
    DynamicRepository1.prototype.delete = function (id) {
        return this.model.findOneAndRemove({ '_id': id });
    };
    DynamicRepository1.prototype.patch = function (id, obj) {
        return this.model.findOneAndUpdate({ '_id': id }, obj);
    };
    DynamicRepository1.prototype.merge = function (source, dest) {
        for (var key in source) {
            if (!dest[key] || dest[key] != source[key]) {
                dest[key] = source[key];
            }
        }
    };
    return DynamicRepository1;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DynamicRepository1;
