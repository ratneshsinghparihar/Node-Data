import Mongoose = require("mongoose");
import * as CoreUtils from '../core/utils';
import {winstonLog} from '../logging/winstonLog';

export function connect() {
    let dbLoc = CoreUtils.config().Config.DbConnection;
    Mongoose.connect(dbLoc, function (error) {
        error ? winstonLog.logError(`Failed to connect db at ${dbLoc} ${error}`) : winstonLog.logInfo('db connection success');
    });
}