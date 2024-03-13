/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const async = require('async');
const Request = require('../models/requestModel');

function checkFriend(req, res, next) {
  // async requests for both request as recipient & issuer where status is accepted
  async.parallel({
    recipient_requests(callback) {
      Request.find({ recipient: req.user._id, status: 'accepted' })
        .exec(callback);
    },
    issuer_requests(callback) {
      Request.find({ issuer: req.user._id, status: 'accepted' })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) return res.status(500).send(err);

    const friends = [];

    results.recipient_requests.forEach((element) => {
      friends.push(element.issuer.toString());
    });

    results.issuer_requests.forEach((element) => {
      friends.push(element.recipient.toString());
    });

    friends.push(req.user._id);

    req.friends = friends.filter((item, i, ar) => ar.indexOf(item) === i);

    next();
  });
}

module.exports = {checkFriend};