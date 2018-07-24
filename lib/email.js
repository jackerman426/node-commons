/**
 * Email class to send emails using Bull queue and sendgrid
 */
'use strict';

const sgMail = require('@sendgrid/mail');
const Queue = require('bull');
const logger = require('./logger');

const queueName = 'email_worker';

/**
 * Email Constructor
 */
function Email() {

    this.isInitialized = false;

    this.options = {
        from: '',
        subject: '',
        to: '',
        text: '',
        attachments: '',
        html: '',
        cc: '',
        categories: ''
    };

    this.jobs = null;

    this.logger = logger;
    logger.initialize();
}

/**
 * This function initializes the email. You need to specify the redis configuration for the bull queue
 * @param {object} redisConfig - The redis configuration for bull queue
 * @param {string} redisConfig.host - Redis host
 * @param {string} redisConfig.port - Redis port
 * @param {string} redisConfig.pass - Redis pass
 * @param {string} redisConfig.db - Redis db
 * @param {string} sendGridApiKey -
 */
Email.prototype.initialize = function (redisConfig, sendGridApiKey) {
    const self = this;

    self.jobs = new Queue(queueName,
      {redis: {
          port: parseInt(_.get(redisConfig, 'port')),
              host: _.get(redisConfig, 'host'),
              password: _.get(redisConfig, 'pass'), db:0,
              enableReadyCheck: true,
              connectTimeout: 20000}}
    );

    if(!sendGridApiKey)
        self.logger.error('Please provide a sendgrid api key')

    sgMail.setApiKey(sendGridApiKey);

    self.isInitialized = true;

};

Email.prototype.setOptions = function (options) {
    const self = this;
    // self.options.to = _.get(options, 'to')
    // self.options.from = _.get(options, 'from')
    // self.options.subject = _.get(options, 'subject')
    // self.options.text = _.get(options, 'text')
    self.options = {
        to : _.get(options, 'to'),
        from : _.get(options, 'from'),
        subject: _.get(options, 'subject'),
        text: _.get(options, 'text'),
        html : _.get(options, 'html'),
        cc: _.get(options, 'cc'),
        bcc: _.get(options, 'bcc'),
        attachments : _.get(options, 'attachments'),
        categories : _.get(options, 'categories')
    };
};

/**
 * This function add a job to email worker. Example of use cases can be found - https://github.com/sendgrid/sendgrid-nodejs/blob/master/packages/mail/USE_CASES.md
 * @param {object} options - The email options
 * @param {string} options.to - Email address recipient
 * @param {string} options.from - Email address sender
 * @param {string} options.subject - Subject of the email
 * @param {string} options.text - Text of the email or html
 * @param {string} options.html - Html template of the email or text
 * @param {array} options.attachments - Array of attachments
 * @param {string} options.cc - CC email addresses
 * @param {string} options.bcc - BCC email addresses
 * @param {array} options.categories
 */
Email.prototype.send = function (options) {
    const self = this;

    self.setOptions(options);

    if (!_.get(self.options, 'to') || !_.get(self.options, 'from') && (!_.get(self.options, 'text') || !_.get(self.options, 'html'))) {
        // self.logger.error("Please specify all require email options! (to, from, text or html)");
        throw new Error("Please specify all require email options! (to, from, text or html) by calling setOptions function");
    }


    self.jobs.process(function(job, next){

        sgMail.send(options, function(error){
            return next(error);
        });
    });

    self.jobs.on('completed', function (job) {
        self.logger.info('Email Job ' + _.get(job, 'id') + ' succeeded');
    });

    self.jobs.on('paused', function () {
        self.logger.info('The queue has been paused');
    });

    self.jobs.on('resumed', function () {
        self.logger.info('The queue has been resumed');
    });

    self.jobs.on('stalled', function (job) {
        self.logger.info('Job ' + _.get(job, 'id') + ' has been stalled');
    });

    self.jobs.on('failed', function (job, result) {
        self.logger.error('Email Job ' + _.get(job, 'id') + ' failed with error ' + _.get(result, 'message'));
    });

    self.jobs.on('ready', function(){
        self.logger.info('Redis is connected and the queue is ready to accept jobs');
    });

    self.jobs.on('error', function(error){
        self.logger.error('A queue error happened: ' + error.message);
    });

    self.jobs.add({});
};



module.exports = new Email();
