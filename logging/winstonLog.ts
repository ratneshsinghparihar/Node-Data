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
    logStream = null;
    constructor() {
        this.winstonLogger = getLogger();
        var _logger = this.winstonLogger;
        this.logStream = {
            write : function(message, encoding){
                _logger.info("message");
            }
        }
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

    configure(options:any){
        this.winstonLogger.configure(options);
    }

    getStream(){
        return this.logStream;
    }
}

var winstonLog = new WinstonLog();
export {winstonLog};