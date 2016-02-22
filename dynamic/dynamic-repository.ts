/// <reference path="../typings/mongoose/mongoose.d.ts" />
/// <reference path="../typings/node/node.d.ts" />

var Mongoose = require("mongoose");
var Config = require('../config');
Mongoose.connect(Config.DbConnection);
//var Config = require('../repos');
var MongooseSchema = Mongoose.Schema;
var http = require("http");
import * as Utils from "../decorators/metadata/utils";

import mongoose = require("mongoose");

var express = require("express");
var router = express.Router();

var bodyParser = require("body-parser");
var Reflect = require('reflect-metadata/Reflect');

var repoList: { [key: string]: any } = {};

export class DynamicRepository {
    private path: string;
    private model: any;
    private metaModel:any;
    private entityType:any;
    constructor(repositoryPath: string, fn: Function, schema: any) {
        this.path = repositoryPath;
        var modelName = this.path.substring(1);
        this.entityType=fn;
        //this.metaModel=new this.entityType();
        repoList[this.path] = repoList[this.path] || Mongoose.model(repositoryPath, schema);
        this.model = repoList[this.path];
    }

    public getModel() {
        return this.model;
    }
    
    

    public addRel() {
        //var user1 = new this.model({"_id": Math.random() + new Date().toString() + this.path + "1", 'name': 'u1' });
        //var user2 = new this.model({ "_id": Math.random() + new Date().toString() + this.path + "2", 'name': 'u2' });
        //this.model.create([user1, user2]).then((msg) => {
        //    console.log(msg);
        //}, (e) => {
        //    console.log(e);
        //});
    }

    public saveObjs(objArr: Array<any>) {
        return this.model.create(objArr).then((msg) => {
            console.log(msg);
        }, (e) => {
            console.log(e);
        });
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
    
    public findByName(name) {
        return this.model.findOne({ 'name': name });
    }

    public findChild(id, prop) {
        return this.model.findOne({ '_id': id });
    }

    public post(obj: any) {
        return (new this.model(obj)).save();
    }

    public put(id: any, obj: any) {
        return this.model.findOneAndUpdate({ '_id': id }, obj, { upsert: true });
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