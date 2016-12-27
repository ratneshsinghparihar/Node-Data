import Mongoose = require("mongoose");
import * as CoreUtils from '../core/utils';
import {winstonLog} from '../logging/winstonLog';
// use main connection for pooling source
export var mainConnection: any = {};
var connectionOptions;
export function connect(dynamicDatabase?: any) {
    let dbLoc = CoreUtils.config().Config.DbConnection;
    connectionOptions = CoreUtils.config().Config.DbConnectionOptions || {};
    Mongoose.connect(dbLoc, connectionOptions, function (error) {
        error ? winstonLog.logError(`Failed to connect db at ${dbLoc} ${error}`) : winstonLog.logInfo('db connection success');
    });
    mainConnection = Mongoose.createConnection(dbLoc);

    // register for dynamic database
    if (dynamicDatabase) {
        userConnection = dynamicDatabase;
    }
}

export function getDbSpecifcModel(schemaName:any,schema: any, dbName: any):any {
    var db2 = mainConnection.useDb(dbName);
    var Model2 = db2.model(schemaName, schema);
    return Model2;
}

export var userConnection;