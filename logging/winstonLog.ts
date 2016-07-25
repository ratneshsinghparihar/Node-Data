import winston = require('winston');

function getLogger(): winston.LoggerInstance {
    return new (winston.Logger)({
        transports: [
            new (winston.transports.Console)()
			//,new (winston.transports.File)({ filename: 'nodedataLog.log', json: true})
        ]
    });
}


class WinstonLog {
    winstonLogger = null;
    constructor() {
        this.winstonLogger = getLogger();
    }

    logInfo(message: any) {
        this.winstonLogger.log('info', message);
    }

    logDebug(message: any) {
        this.winstonLogger.log('debug', message);
    }

    logError(message: any) {
        this.winstonLogger.log('error', message);
    }
}

var winstonLog = new WinstonLog();
export {winstonLog};