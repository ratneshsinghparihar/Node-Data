/// <reference path="../typings/mongoose/mongoose.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

var Mongoose = require("mongoose");
var Config = require('../config');
//var Config = require('../repos');
var schema = Mongoose.Schema;
var http = require("http");
import * as Utils from "../decorators/metadata/utils";

import mongoose = require("mongoose");

var express = require("express");
var router = express.Router();

var bodyParser = require("body-parser");
var Reflect = require('reflect-metadata/Reflect');

Mongoose.connect(Config.DbConnection);
var repoList: { [key: string]: any } = {};

export default class DynamicRepository1 {
    private path: string;
    private model: any;
    private metaModel:any;
    private entityType:any;
    constructor(path1: string, fn: Function, schema: any) {
        this.path = path1;
        var modelName = this.path.substring(1);
        this.entityType=fn;
        //this.metaModel=new this.entityType();
        repoList[this.path] = repoList[this.path] || Mongoose.model(path1, schema || new schema({}, { strict: false }));
        this.model = repoList[this.path];
    }

    public modelName(){
        return this.model.modelName;
    }
    
    public getEntityType(){
        return this.entityType;
    }
    
    public findAll() {
        return this.model.find();
    }
    public findOne(id) {
        return this.model.findOne({ '_id': id });
    }

    public findChild(id, prop) {
        return this.model.findOne({ '_id': id });
    }

    public post(obj: any) {
        return (new this.model(obj)).save();
    }

    public put(id: any, obj: any) {
        return this.model.update({ '_id': id }, obj, { upsert: true });
        //return this.delete(id)
        //    .then(result => {
        //        return this.post(obj);
        //    });
    }

    public delete(id: any) {
        return this.model.findOneAndRemove({ '_id': id });
    }

    public patch(id: any, obj) {
        return this.model.findOneAndUpdate({ '_id': id }, obj);
    }

    private merge(source, dest) {
        for (var key in source) {
            if (!dest[key] || dest[key] != source[key]) {
                dest[key] = source[key];
            }
        }
    }

   

    //private findNthIndex(str: string, subStr: string, n: number) {
    //    var index = -1;
    //    for (; n > 0; n--) {
    //        index = str.indexOf(subStr, index + 1);
    //        if (n == 1 || index == -1) {
    //            return index;
    //        }
    //    }
    //}
}