import Mongoose = require("mongoose");
import * as CoreUtils from '../core/utils';
import {winstonLog} from '../logging/winstonLog';
import {PrincipalContext} from '../security/auth/principalContext';
import Q = require('q');
// use main connection for pooling source
export var mainConnection: any = {};
var allConnections: any = {};
var connectionOptions;

export function connect() {
    let dbLoc = CoreUtils.config().Config.DbConnection;
    connectionOptions = CoreUtils.config().Config.DbConnectionOptions || {};
    getConnection(dbLoc, connectionOptions);
    mainConnection = Mongoose.createConnection(dbLoc);
}

export function getDbSpecifcModel(schemaName: any, schema: any, database: any): any {
    if (database && allConnections[database]) {
        return allConnections[database].model(schemaName, schema);
    }
    else {
        return mainConnection.model(schemaName, schema);
    }
}

export function updateConnection(connectionString, connectionOption): Q.IPromise<any> {
    PrincipalContext.save(CoreUtils.resources.userDatabase, connectionString);
    return getConnection(connectionString, connectionOption);
}

function getConnection(connectionString, connectionOption): Q.IPromise<any> {
    if (!connectionString)
        return Q.when(false);

    if (!allConnections[connectionString]) {
        var prom = Q.nbind(Mongoose.connect, Mongoose)(connectionString, connectionOption).then(error => {
            error ? winstonLog.logError(`Failed to connect db at ${connectionString} ${error}`) : winstonLog.logInfo('db connection success');
            return true;
        }).catch(exc => {
            winstonLog.logError(`Failed to connect db at ${connectionString} ${exc}`);
            return false;
            });
        allConnections[connectionString] = Mongoose.createConnection(connectionString, connectionOptions);
        return prom;
    }
    else {
        return Q.when(true);
    }
}