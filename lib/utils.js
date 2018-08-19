'use strict'

const async = require('async')
const path = require('path')
const recursive = require('recursive-readdir')
const crypto = require('crypto')
const uuid = require('uuid')
const logger = require('./logger')
const request = require('request').defaults({encoding: null})

/**
 * Utils constructor
 */
function Utils () {

}

/**
 * This function loads (requires) files in a folder without index file
 * @param {string} baseDir - The directory of the files
 * @param {function} next - the callback function
 */
Utils.prototype.loadClassesInFolder = function (baseDir, next) {
  const resolvedClasses = {}

  recursive(baseDir, function (err, files) {
    async.map(files.reverse(), function (file, callback) {
      try {
        const filePath = path.resolve(file)
        const fileName = path.basename(filePath)
        const extension = path.extname(filePath)

        if (extension === '.js') {
          const fileClass = require(filePath)

          if (_.isString(fileClass.modelName) && fileClass.modelName.length > 0) {
            resolvedClasses[fileClass.modelName] = fileClass
            logger.info('Initialized mongo model ' + fileClass.modelName)
          } else {
            const className = fileName.slice(0, fileName.indexOf(extension))
            resolvedClasses[className] = fileClass
            logger.info('Initialized class ' + className)
          }
        }
        return callback(null)
      } catch (error) {
        return callback(error)
      }
    }, function (error) {
      return next(error, resolvedClasses)
    })
  })
}

/**
 * This function loads (requires) files from a dir with an index.js file (you should require the files in the index file) - used if you want to load the files in order
 * @param {string} baseDir - The directory of the files
 * @param {function} next - the callback function
 */
Utils.prototype.loadClassesInFolderWithIndexFile = function (baseDir, next) {
  return next(null, require(path.resolve(next)))
}

/**
 * Remove properties from object if exists
 * @param object
 * @param properties - array of properties or single property name
 */
Utils.prototype.removeProperties = function (object, properties) {
  if (_.isString(properties)) {
    if (object !== undefined) {
      delete object[properties]
    }
  } else if (_.isArray(properties)) {
    _.forEach(properties, function (value) {
      if (object !== undefined) {
        delete object[value]
      }
    })
  } else {
    throw new Error('Invalid properties argument')
  }
}

/**
 * Append component to path
 * @param basePath
 * @param component - component to add to the path
 * @returns {*}
 */
Utils.prototype.appendComponentToPath = function (basePath, component) {
  let result = basePath

  if (_.isString(result) && _.isString(component)) {
    if (result.length === 0) {
      result = '/'
    } else if (result[result.length - 1] !== '/') {
      result = result + '/'
    }

    if (component.length > 0) {
      if (component[0] === '/') {
        result += component.substr(1)
      } else {
        result += component
      }
    }
  }

  return result
}

/**
 * Append array of path components
 * @param basePath
 * @param components
 * @returns {*}
 */
Utils.prototype.appendComponentsToPath = function (basePath, components) {
  const self = this
  let result = basePath
  if (_.isArray(components)) {
    components.forEach(function (component) {
      result = self.appendComponentToPath(result, component)
    })
  }

  return result
}

/**
 * Append query parameters to url
 * @param url
 * @param parameters
 * @returns {string}
 */
Utils.prototype.appendQueryParameters = function (url, parameters) {
  //Add remaining parameters
  if (parameters) {

    const queryParameters = []

    _.forEach(parameters, function (value, key) {
      if (value) {
        queryParameters.push(key + '=' + value)
      }
    })

    if (queryParameters.length > 0) {
      url += '?' + queryParameters.join('&')
    }
  }

  return url
}

/**
 * Build a url from components and parameters
 * @param components
 * @param parameters
 * @returns {string}
 */
Utils.prototype.urlFromComponents = function (components, parameters) {
  const self = this
  const resultComponents = []

  _.forEach(components, function (component) {

    let resultComponent = component
    if (resultComponent.length > 0 && resultComponent[0] === '/') {
      resultComponent = resultComponent.substr(1)
    }

    if (resultComponent.length > 0 && resultComponent[resultComponent.length - 1] === '/') {
      resultComponent = resultComponent.substring(0, resultComponent.length - 1)
    }

    if (resultComponent.length > 0) {
      const matches = resultComponent.match(/^{(.*)}$/)
      if (matches && matches.length === 2 && matches[1].length > 0) {
        if (parameters[matches[1]] && parameters[matches[1]].length > 0) {
          resultComponents.push(parameters[matches[1]])
          delete parameters[matches[1]]
        } else {
          throw 'Parameter not found ' + matches[1]
        }
      } else {
        resultComponents.push(resultComponent)
      }
    }
  })

  const result = resultComponents.join('/')

  return self.appendQueryParameters(result, parameters)
}

/**
 * Generate unitque token
 * @param {object} options
 * @param {} options.seed
 * @returns {*}
 */
Utils.prototype.generateUniqueToken = function (options) {
  options = options || {}
  options.seed = options.seed || uuid.v4()

  return crypto.createHash('sha1').update(options.seed).digest('hex')

}

/**
 * Generates cryptographically strong pseudo-random data. The size argument is a number indicating the number of bytes to generate.
 * @param {number} noOfBytes
 * @param {function} next
 * @returns {*}
 */
Utils.prototype.generateRandomBytes = function (noOfBytes, next) {
  crypto.randomBytes(noOfBytes, function (error, buf) {
    if (error) {
      return next(error, null)
    } else {
      const token = buf.toString('hex')
      return next(null, token)
    }
  })
}

/**
 * Flatterns an object
 * @param {object} collection
 * @param {object} result
 * @param {string} prefix
 * @returns {*}
 */
Utils.prototype.flattern = function (collection, result, prefix) {
  const self = this
  if (_.isObject(collection)) {

    if (_.isArray(collection)) {
      result[prefix] = []
      _.each(collection, function (value, key) {
        if (_.isObject(value)) {
          if (value.constructor.name === 'model') {
            result[prefix].push(value)
          } else {
            const flatObject = flattern(value, {})
            result[prefix].push(flatObject)
          }
        } else {
          result[prefix].push(value)
        }
      })
    } else {
      _.each(collection, function (value, key) {
        self.flattern(value, result, prefix ? prefix + '.' + key : key)
      })
    }
  } else {
    result[prefix] = collection
  }
  return result
}

/**
 * Downloads image from web and convert to base64
 * @param {string} imageUrl
 * @param {function} next
 * @returns {*}
 */
Utils.prototype.convertUrlToBase64 = function (imageUrl, next) {

  request.get(imageUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const data = 'data:' + response.headers['content-type'] + ';base64,' + new Buffer(body).toString('base64')
      return next(error, data)
    } else {
      logger.error('Commons-Utils-convertUrlToBase64' + _.get(error, 'message'))
      return next(null)
    }
  })
}

module.exports = new Utils()