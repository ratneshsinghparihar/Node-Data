/// <reference path="../typings/linq/linq.3.0.3-Beta4.d.ts" />

import * as dc from './dynamic-controller';
import {Initalize} from './initialize';
var fs = require('fs');
var path = require('path');
import * as Utils from "../decorators/metadata/utils";
import {ParamTypeCustom} from '../decorators/metadata/param-type-custom';

var Mongoose = require("mongoose");
var schema = Mongoose.Schema;
var Config = require('../config');

//import linq = require('../typings/linq/linq');
var Enumerable: linqjs.EnumerableStatic = require('linq');


export default class Dynamic {
    constructor() {
        var files = fs.readdirSync('repositories');
        var aa = [];
        files.filter((value) => value.match(/[a-zA-Z0-9.]*ts$/))
            .forEach((file: string, index: number, array) => {
                var route = path.resolve(process.cwd(), 'repositories\\' + file.substring(0, file.lastIndexOf('.')));
                var zz = require(route);
                //var r = new zz.default();
                //this.initRepo(zz.default.path, null);
                console.log(file);
                aa.push(zz.default);
            });
        new Initalize(aa);
    }
}


//var exportObj: any = {};
//exportObj.repo = DynamicRepository;
//exportObj.router = router;

export var repo = Dynamic;
export var dynamicRouter = dc.router;
