import winston = require('winston');

function getLogger(): winston.LoggerInstance {
    return new (winston.Logger)({
        transports: [
            new (winston.transports.Console)()
			//,new (winston.transports.File)({ filename: 'nodedataLog.log', json: true})
        ]
    });
}

/**
 * A wrapper around the winston logging framework.
 */
class WinstonLog {
    winstonLogger = null;
    logStream = null;
    constructor() {
        this.winstonLogger = getLogger();
        var _logger = this.winstonLogger;
        this.logStream = {
            write : function(message, encoding){
                _logger.debug(message);
            }
        }
    }

    /**
     * Logs the message as info.
     * @param message The message to be logged.
     * @param meta Any additional metadata.
     */
    logInfo(message: any, meta? : any) {
        this.winstonLogger.log('info', message, meta);
    }

    /**
     * Logs the message as Debug
     * @param message The message to be logged
     * @param meta Any additional metadata
     */
    logDebug(message: any, meta? : any) {
        this.winstonLogger.log('debug', message, meta);
    }

    /**
     * Logs the message as Erro
     * @param message The message to be logged
     * @param meta Any additional metadata
     */
    logError(message: any, meta? : any) {
        this.winstonLogger.log('error', message, meta);
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