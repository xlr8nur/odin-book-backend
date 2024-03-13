/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const aws = require('aws-sdk');
const dotenv = require('dotenv');
const crypto = require('crypto');
const util = require('util');
const express = require('express');

const randomBytes = util.promisify(crypto.randomBytes);

dotenv.config();
const router = express.Router();

const region = 'eu-west-2';
const bucketName = 'odinbookjr';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new aws.S3({
  region,
  accessKeyId,
  secretAccessKey,
  signatureVersion: 'v4',
});

const generateUploadUrl = async () => {
  const bytes = await randomBytes(16);
  const imageName = bytes.toString('hex');

  const params = {
    Bucket: bucketName,
    Key: imageName,
    Expires: 60,
  };

  const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
  return uploadUrl;
};

// GET paginated posts of current frens
router.get('/', async (req, res) => {
  try {
    const url = await generateUploadUrl();
    res.send(url);
  } catch (errors) {
    res.status(500).json(errors);
  }
});

module.exports = router;