/**
 * S3 class to upload filed to AWS S3 service
 */
'use strict';

const fs = require('fs');
const async = require('async');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const config = require('./config');
const utils = require('./utils');
const logger = require('./logger');

const gm = require('gm').subClass({
    imageMagick: true
});

/**
 * S3 Constructor
 */
function S3() {

    this.BUCKETS = [];
    this.tempFilesDir = '';

    this.logger = logger;
    logger.initialize();
}

/**
 * This function adds a bucket in S3
 * @param {object[]} buckets - An array of buckets (options for each bucket)
 * @param {string} buckets[].name - The name of the bucket
 * @param {array} buckets[].allowedExtensions - Array of allowed file extensions e.g ["jpeg", "gif", "bmb", "tiff", "png", "jpg"];
 * @param {number} buckets[].maxSize - The max size of each file in the bucket in bytes eg. 5000000 for 5 mb approx
 */
S3.prototype.initialize = function (buckets) {
    const self = this;

    if(!_.get(config, 'awsAccessKeyId') || !_.get(config, 'awsSecretAccessKey'))
        throw new Error("Please specify AWS credentials for the S3 uploaded. Set as env variables AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY ");

    buckets.forEach(function(bucket){
        if(!_.get(bucket, 'name') || !_.get(bucket, 'allowedExtensions') || !_.get(bucket, 'maxSize'))
            throw new Error("Please specify all bucket options (name, allowedExtensions, maxSize)");

        self.BUCKETS.push({
            name: _.get(bucket, 'name'),
            allowedExtensions: _.get(bucket, 'allowedExtensions'),
            maxSize: _.get(bucket, 'maxSize')
        })
    });
    self.tempFilesDir = utils.urlFromComponents(["/" + __dirname, "/tempS3Files/"]);

};



/**
 * This function upload a Base64 encoded file in AWS S3
 * @param {object} options - The options of the upload
 * @param {string} options.bucketName - The name of the bucket you want to upload the file
 * @param {string} options.fileName - The name of the file
 * @param {string} options.data - The Base 64 encoded file
 * @param {object} options.size - The Base 64 encoded file desired size - if you want to resize an image you should provide this option
 * @param {number} options.size.height - The Base 64 encoded file desired height
 * @param {number} options.size.width - The Base 64 encoded file desired width
 * @param {function} next - The callback function
 */
S3.prototype.uploadFile = function (options, next) {

    let buffer = null;
    const self = this;

    const fileName = _.get(options, 'fileName');
    const bucketName = _.get(options, 'bucketName');
    let data = _.get(options, 'data');

    //get relevant bucket from the name
    const bucket = _.find(self.BUCKETS, function(bucket){return bucket.name === bucketName});

    const filePath = utils.appendComponentToPath(self.tempFilesDir, fileName);

    const height = _.get(options, 'size.height');
    const width = _.get(options, 'size.width');

    let contentType = null;

    async.auto({

        create_temp_directory: function (callback) {
            if (!fs.existsSync(self.tempFilesDir)) {
                self.logger.debug(`Creating tmp folder location: ${self.tempFilesDir}`);
                fs.mkdir(self.tempFilesDir);
            }
            return callback(null);
        },

        check_bucket: function (callback) {
            if(_.get(self.BUCKETS, 'length') === 0)
                throw new Error("Please initialize the class by calling initialize function with bucket options!");

            if(!bucket)
                throw new Error("No such Bucket exists with that name please add it during initialization!");

            //check if all require fields are present
            if(!bucketName|| !fileName || !data)
                throw new Error("Please specify all options (bucketName, fileName, data)");

            return callback(null);

            //this doesnt work. we may need to add it later (check if bucket exists in s3)
            // s3.waitFor('bucketExists', {Bucket: _.get(bucket, 'name')}, function(err, data) {
            //     if(err){
            //         logger.error(err, err.stack)
            //     } else {
            //         logger.info(data)
            //         return callback(null);
            //     }
            // });
        },

        check_input: function (callback) {

            const fileType = data.split(';')[0].split('/')[1];
            const imgFileSize = Math.round((_.get(data, 'length')) * 3 / 4);

            if (!_.isString(data))
                throw new Error("file data not instance of a buffer");

            if (!bucket.allowedExtensions.includes(fileType))
                throw new Error("This file extension is not supported for this Bucket");


            if (imgFileSize > bucket.maxSize) {
                throw new Error("Your file should be less than " + bucket.maxSize.toString() + ' bytes');
            }
            return callback(null);

        },


        extract_content_type: ['check_input', function(results, callback){

            const tempString = data.split(",");
            const prefix = tempString[0];

            data = tempString[1];
            contentType = prefix.substring(
              prefix.lastIndexOf(":") + 1,
              prefix.lastIndexOf(";")
            );

            return callback(null);

        }],


        b64_to_buffer: ['check_input', 'check_bucket', 'create_temp_directory', 'extract_content_type', function (results, callback) {

            buffer = Buffer.from(data, 'base64');
            logger.info(`File Buffer Size: ${buffer.length}`);
            return callback(null, buffer);
        }],



        resize_image: ['b64_to_buffer', 'extract_content_type', function (result, callback) {
            buffer = result['b64_to_buffer'];
            //the resizing doesnt seemt o work
            if (height && width) {
                gm(buffer, fileName)
                  .resize(width, height, '!')
                  .toBuffer(function (error, buf) {
                      return callback(error, buf);
                  });
            } else {
                return callback(null, buffer);
            }
        }],

        write_in_stream: ['resize_image', function (results, callback) {
            async.waterfall([

                // WRITE THE FILE LOCALLY TO DISK
                function(callback){
                    fs.writeFile(filePath, buffer, function(error) {
                        if(error){
                            throw error;
                        } else {
                            return callback(null);
                        }
                    });
                },

                // WRITE FILE TO S3
                function (callback) {
                    fs.readFile(filePath, function (fileError, fileData) {
                        if(fileError){
                            logger.error(`Unable to read the file from the local tmp dir ${fileError}`);
                            return callback(fileError);
                        }
                        // PROCEED WITH UPLOAD.
                        //do we need contentType?
                        let params = {
                            ACL: "public-read",
                            Bucket: bucketName,
                            Key: fileName,
                            ContentType: contentType,
                            Body: fileData
                        };
                        s3.upload(params, function (err, data) {
                            if (err) {
                                logger.error("Error Unable to complete fileUpload to s3. " + err);
                                return callback(err)
                            }
                            logger.info(`Successfully uploaded file. Bucket: ${bucketName}, Key: ${fileName}`);
                            logger.info(`Public File URL: ${data.Location}`);
                            fs.unlink(filePath, function (error) {
                                if (error) {
                                    throw error;
                                } else {
                                    return callback(null, data.Location);
                                }
                            });
                        });
                    });
                }
            ], function (error, fileUrl) {
                return callback(error, fileUrl);
            });
        }]
    }, function (error, results) {
        let fileUrl = results['write_in_stream'];
        return next(error, fileUrl);
    });


};

module.exports = new S3();
