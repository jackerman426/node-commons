require('dotenv').config()
global['_'] = require('lodash')

const mongoose = require('./mongoose')
const logger = require('./logger')
const email = require('./email')
const utils = require('./utils')
const s3 = require('./s3')
const responseBuilder = require('./responseBuilder');

module.exports = exports = {
  db: {mongoose},
  logger,
  workers: {email},
  utils,
  files: {s3},
  responseBuilder
}