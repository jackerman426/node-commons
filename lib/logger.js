/**
 * Winston logger configured with info logging level and
 * log format.
 *  Example output:
 *      2018-06-19T09:20:30.742Z  - INFO - Starting Application
 */
'use strict';
const fs = require('fs');
const logger = require('winston');
const { format } = require('winston');
const { combine, timestamp, printf } = format;
const logFormat = printf(info => {
    return `${info.timestamp}  - ${info.level.toUpperCase()} - ${info.message}`;
});

/**
 * Winston Constructor
 */
function Logger() {
    this.logger = null;
    this.isInitialized = false;
}

/**
 * This function initializes the winston logger. You need to specify the path where the log file is going to be saved
 * @param {string} logDir - The base url to save the
 * @param {string} level - levels of logging  (default npm levels - https://github.com/winstonjs/winston#logging-levels)
 */
Logger.prototype.initialize = function (logDir, level) {
    const self = this;

    self.logger = logger.createLogger({
        level: level,
        exitOnError: false,
        format: combine(
          timestamp(),
          logFormat
        ),
        transports: [
            new logger.transports.Console(),
        ]
    });
    if(logDir){
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
        self.logger.add(new logger.transports.File({ filename: logDir + '/application.log' }))
    }

    self.isInitialized = true
};

/**
 * This function logs an error
 */
Logger.prototype.error = function (error) {
    const self = this;
    self.logger.error(error);
};
/**
 * This function logs a warning
 */
Logger.prototype.warn = function (warn) {
    const self = this;
    self.logger.warn(warn);
};
/**
 * This function logs info
 */
Logger.prototype.info = function (info) {
    const self = this;
    self.logger.info(info);
};

/**
 * This function logs debug
 */
Logger.prototype.debug = function (debug) {
    const self = this;
    self.logger.debug(debug);
};

module.exports = new Logger();