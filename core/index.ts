import {Initalize} from './initialize/initialize';
import fs = require('fs');
var recursiveReadDir = require('recursive-readdir-synchronous');
import path = require('path');
import Q = require("q");
import * as Utils from './utils';
import {MetaUtils} from './metadata/utils'
import {IEntityService} from './interfaces/entity-service';

//import linq = require('../typings/linq/linq');
var Enumerable: linqjs.EnumerableStatic = require('linq');

// Ignore .d.ts and all other non .ts files
function ignoreFile(file: string, stats: fs.Stats) {
    return path.extname(file) !== '.ts' || file.endsWith('.d.ts') || file.endsWith('.spec.ts');
}

// ignore node_modules or folders starting with '.', eg. '.git'
function ignoreDirectory(file: string, stats: fs.Stats) {
    return path.basename(file) == "node_modules" || path.basename(file).startsWith('.') || path.basename(file) == "unit-test";
}

function readIgnore(file: string, stats: fs.Stats) {
    return (stats.isFile() && ignoreFile(file, stats))
        || (stats.isDirectory() && ignoreDirectory(file, stats));
}

let _appRoot = process.cwd();

class Dynamic {
    constructor(config: any, securityConfig: any) {
        Utils.config(config);
        Utils.securityConfig(securityConfig);
        config = config;
        securityConfig = securityConfig;
        var files = this.scanDirectories();
        this.loadComponents(files);
        this.initialize(files);
    }

    scanDirectories(): Array<string> {
        return recursiveReadDir(_appRoot, [readIgnore]);
        //return Q.nfapply(recursiveReadDir, [_appRoot, [readIgnore]]);
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

module.exports = function (config: any, securityConfig: any, appRoot?: string,
    entityServiceInst?: IEntityService,
    sqlServerInst?: IEntityService) {
    // application root (where we scan the components) set priority: 
    // 1. User provided 
    // 2. Environment Variable 
    // 3. Current working directory
    _appRoot = appRoot || process.env.APP_ROOT || process.cwd();
    //Utils.entityService(entityServiceInst);
    //Utils.sqlEntityService(sqlServerInst);
    new Dynamic(config, securityConfig);
    MetaUtils.refreshDerivedObjectsMetadata();
}

let components: Array<any> = [];

export function addComponent(comp: any) {
    components.push(comp);
}

export function initialize(config: any, securityConfig: any, appRoot?: string,
    entityServiceInst?: IEntityService,
    sqlServerInst?: IEntityService) {
    // application root (where we scan the components) set priority: 
    // 1. User provided 
    // 2. Environment Variable 
    // 3. Current working directory
    _appRoot = appRoot || process.env.APP_ROOT || process.cwd();
    //Utils.entityService(entityServiceInst);
    new Dynamic(config, securityConfig);
    //Utils.sqlEntityService(sqlServerInst);
    components.forEach(x => {
        x.default();
    });
}