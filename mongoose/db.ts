import Mongoose = require("mongoose");
import * as CoreUtils from '../core/utils';
import {winstonLog} from '../logging/winstonLog';
// use main connection for pooling source
export var mainConnection:any = {};
export function connect() {
    let dbLoc = CoreUtils.config().Config.DbConnection;
    let connectionOptions = CoreUtils.config().Config.DbConnectionOptions || {};
    Mongoose.connect(dbLoc, connectionOptions, function (error) {
        error ? winstonLog.logError(`Failed to connect db at ${dbLoc} ${error}`) : winstonLog.logInfo('db connection success');
    });
    mainConnection = Mongoose.createConnection(dbLoc);

}

export function getDbSpecifcModel(schemaName:any,schema: any, dbName: any):any {
    var db2 = mainConnection.useDb(dbName);
    var Model2 = db2.model(schemaName, schema);
    return Model2;
}