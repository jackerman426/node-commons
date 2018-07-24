global['_'] = require('lodash');
require('dotenv').config();

const mongoose = require('./mongoose');
const logger = require('./logger');
const email = require('./email');
const utils = require('./utils');
const s3 = require('./s3');


module.exports = exports = {
    db:{mongoose},
    logger,
    workers:{email},
    utils,
    files: {s3}
};