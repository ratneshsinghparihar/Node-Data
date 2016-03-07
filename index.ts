/// <reference path="typings/node/node.d.ts" />
/// <reference path="typings/recursive-readdir/recursive-readdir.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

import {Initalize} from './dynamic/initialize';
import fs = require('fs');
import recursiveReadDir = require('recursive-readdir');
import path = require('path');
import Q = require("q");

import Config = require('./config');
import Utils = require('./utils');

//import linq = require('../typings/linq/linq');
var Enumerable: linqjs.EnumerableStatic = require('linq');

// Ignore .d.ts and all other non .ts files
function ignoreFile(file: string, stats: fs.Stats) {
    return path.extname(file) !== '.ts' || file.endsWith('.d.ts');
}

// ignore node_modules or folders starting with '.', eg. '.git'
function ignoreDirectory(file: string, stats: fs.Stats) {
    return path.basename(file) == "node_modules" || path.basename(file).startsWith('.');
}

function readIgnore(file: string, stats: fs.Stats) {
    return (stats.isFile() && ignoreFile(file, stats))
        || (stats.isDirectory() && ignoreDirectory(file, stats));
}

let _appRoot = process.cwd();

class Dynamic {
    constructor(config: any) {
        Utils.config(config);
        config = config;

        this.scanDirectories()
            .then(result => {
                this.loadComponents(result);
                this.initialize(result);
            })
            .catch(error => console.log(error));
    }

    scanDirectories(): Q.Promise<any> {
        return Q.nfapply(recursiveReadDir, [_appRoot, [readIgnore]]);
    }

    loadComponents(files: Array<string>) {
        Enumerable.from(files)
            .forEach(x => {
                try {
                        var route = path.resolve(x.substring(0, x.lastIndexOf('.')));
                        require(route);
                } catch (e) {
                    console.log(e);
                    throw e;
                }
            });

    }

    initialize(files: Array<string>) {
        new Initalize(files);
    }
}

module.exports = function (config: any, appRoot?: string) {
    // application root (where we scan the components) set priority: 
    // 1. User provided 
    // 2. Environment Variable 
    // 3. Current working directory
    _appRoot = appRoot || process.env.APP_ROOT || process.cwd();
    new Dynamic(config);
}