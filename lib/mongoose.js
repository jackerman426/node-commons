/**
 * Mongoose class to make the connection to mongoDB
 */
'use strict'

const mongoose = require('mongoose')

const logger = require('./logger')

/**
 * Mongoose Constructor
 */
function Mongoose () {

  this.mongoUri = 'mongodb://localhost:27017'

  this.options = {
    setNewUrlParser: true,
    autoReconnect: true,
    reconnectTries: 10000,
    poolSize: 20,
    keepAlive: 1,
    connectTimeoutMS: 30000
  }

  this.connected = false
  this.db = null
  this.mongoose = mongoose

  this.logger = logger
  logger.initialize()

}

/**
 * This function connects to mongoDB.
 * By default it connects to localhost mongoDB. If you want to connect to external db you need to provide a uri and options
 * @param {string} mongoUri - The mongo uri to connect
 * @param {object} options - The options for connecting
 * @param {function} callback - The callback function
 */
Mongoose.prototype.connectToMongoDb = function (mongoUri, options, callback) {

  const self = this

  self.mongoUri = mongoUri || self.mongoUri
  self.options = options || self.options

  this.mongoose.Promise = global.Promise
  this.db = this.mongoose.connection

  // Initialize mongoose event listeners
  this.db.on('connected', function () {
    self.connected = true
    self.logger.info('Mongoose is connected!')
    return callback(null)
  })

  this.db.on('error', function (error) {
    self.logger.error('Mongoose default connection error: ' + error)
    return callback(error)
  })

  this.db.on('connecting', function () {
    self.logger.info('Mongoose is connecting to Mongo')
  })

  this.db.on('disconnected', function () {
    self.connected = false
    self.logger.warn('Mongoose default connection disconnected')

    //TODO: Do the reconnect here
  })

  // Connect
  this.mongoose.connect(self.mongoUri, self.options)
}

module.exports = new Mongoose()