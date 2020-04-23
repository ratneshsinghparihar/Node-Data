import Mongoose = require("mongoose");
import * as CoreUtils from '../core/utils';
import {winstonLog} from '../logging/winstonLog';
import {PrincipalContext} from '../security/auth/principalContext';
import Q = require('q');
// use main connection for pooling source
export var mainConnection: any = {};
var allConnections: any = {};
var connectionOptions;
import EventEmitter = require('events');
var emitters: Array<EventEmitter.EventEmitter> = new Array<EventEmitter.EventEmitter>()

export function connect() {
    let dbLoc = CoreUtils.config().Config.DbConnection;
    connectionOptions = CoreUtils.config().Config.DbConnectionOptions || {};
    getConnection(dbLoc, connectionOptions);
    mainConnection = allConnections[dbLoc];
}

export function getMongooseContext(){
    return mainConnection;
}

export function getDbSpecifcModel(schemaName: any, schema: any): any {
    var database = PrincipalContext.get(CoreUtils.resources.userDatabase);
    if (database && allConnections[database]) {
        return allConnections[database].model(schemaName, schema);
    }
    else {
        return mainConnection.model(schemaName, schema);
    }
}

export function addEmitter(msg: EventEmitter.EventEmitter) {
    emitters.push(msg);
}
export function removeEmitter(msg: EventEmitter.EventEmitter) {
    emitters = emitters.filter((mem) => { return mem != msg });
}

export function updateConnection(connectionString, connectionOption): Q.IPromise<any> {
    PrincipalContext.save(CoreUtils.resources.userDatabase, connectionString);
    return getConnection(connectionString, connectionOption);
}

function getConnection(connectionString, connectionOption): Q.IPromise<any> {
    if (!connectionString)
        return Q.when(false);

    if (!allConnections[connectionString]) {
        var conn = Mongoose.createConnection(connectionString, defaultDomainOptions(connectionOption));
        allConnections[connectionString] = conn;
        return connectDataBase(conn, connectionString);
    }
    else {
        return Q.when(true);
    }
}

const emitMesseageToALL = (event, message) => {
    try {
        if (emitters && emitters.length) {
            emitters.forEach((emitter) => {
                emitter.emit(event, message);
            })
        }
    }
    catch (ex) { }
};

function connectDataBase(conn, connectionString): Q.IPromise<any> {
    let defer = Q.defer();
    conn.on('connecting', () => {
        winstonLog.logInfo(`trying to establish connection for ${connectionString}`);
    });

    conn.on('connected', () => {
        winstonLog.logInfo(`connection established successfully ${connectionString}`);
        defer.resolve(true);
        emitMesseageToALL('databaseconnected', conn);
    });

    conn.on('error', (err) => {
        winstonLog.logInfo(`connection to mongo failed for ${connectionString} with error ${err}`);
        defer.resolve(false);
        emitMesseageToALL('error', conn);
    });

    conn.on('disconnected', () => {
        winstonLog.logInfo(`connection closed successfully ${connectionString}`);
        defer.resolve(false);
        emitMesseageToALL('disconnected', conn);
    });
    return defer.promise;
}

function defaultDomainOptions(connectionOption: any) {


    if (!connectionOption) {
        connectionOption = {};
    }
    if (!connectionOption['server']) {
        connectionOption['server'] = {};
    }
    if (!connectionOption['replset']) {
        connectionOption['replset'] = {};
    }
    connectionOption['server']['domainsEnabled'] = true;
    connectionOption['replset']['domainsEnabled'] = true;
    return connectionOption;
}