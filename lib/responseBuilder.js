/**
 * Response Builder class to build a response for an express app
 */


'use strict'
/**
 * Response-Builder Constructor
 */
function ResponseBuilder() {
}

/**
 * This function sends response through http
 * @param {object} res - The response object
 * @param {object} error - The error object
 * @param {object} data - The data object
 */
ResponseBuilder.prototype.sendResponse = function (res, error, data) {
  // prepare response:
  const sendResponse = {};

  sendResponse.result = (!error);
  sendResponse.data = null;
  sendResponse.error_message = "";
  sendResponse.error_code = null;


  if(data !== undefined) {
    sendResponse.data = data;
  }

  if (error) {
    sendResponse.error_message = error.message;
    sendResponse.error_code = error.code;

    if (error.status && error.status > 0) {
      // Http status code
      res.status(error.status);
    }
  }

  res.send(sendResponse);
};

// Expose Builder
module.exports = new ResponseBuilder();
