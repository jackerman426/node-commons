class Config {
    constructor(args) {
        this.awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
        this.awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    }
}

module.exports = exports = new Config();