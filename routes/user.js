/* eslint-disable eqeqeq */
/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */

const express = require('express');
const { body, validationResult } = require('express-validator');
const async = require('async');
const Request = require('../models/requestModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const DeleteUser = require('../models/deleteUserModel');
const { checkFriend } = require('../helpers/helpers');

const router = express.Router();

/* GET user jwt payload info */
router.get('/', (req, res) => {
  res.send(req.user);
});

// DELETE user from db
router.delete('/', (req, res) => {
  const newDeletionRequest = new DeleteUser({
    user: req.user._id,
    created: new Date(),
    actioned: false,
  });
  newDeletionRequest.save((err) => {
    if (err) return res.status(500);
    res.status(201).send('deletion scheduled');
  });
});

// Get info of user
router.get('/info', (req, res) => {
  // find user by ID and return info from db
  User.findOne({ _id: req.user._id })
    .select('-_id -active -facebook.id')
    .exec((err, data) => {
      // handling db error
      if (err) res.status(500).send(err);

      res.status(200).json(data);

    });
});

// UPDATE (put) users profile picture
router.put('/picture', (req, res) => {
  const filter = { _id: req.user._id };
  const doc = { $set: { profilePicture: req.body.path } };
  const options = { new: true };

  User.findOneAndUpdate(filter, doc, options, (err, newDoc) => {
    // handling db error
    if (err) res.status(500).json(err.message);

    // if updated, return new updated path
    res.status(200).send(newDoc.profilePicture);
  });
});

// UPDATE users rel status
router.put('/relationship', [
  // validate and sanitise fields
  body('status')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Title must be specified')
    .isLength({ max: 100 })
    .withMessage('Status exceeds maximum length')
    .escape(),

  // process req after validation and sanitization
  (req, res) => {
    // extract the validation errors from a req
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json(validationErrors);
    } else {
      // if no validation errors then
      const filter = { _id: req.user._id };
      const doc = { $set: { relationshipStatus: req.body.status } };
      const options = { new: true };

      User.findOneAndUpdate(filter, doc, options, (err, newDoc) => {
      // handling db error
        if (err) res.status(500).send(err);

        // if updated then return new updated path
        res.status(200).send(newDoc.relationshipStatus);
      });
    }
  },
]);

// Create a test user to try it out
router.post('/testuser', (req, res) => {
  // Create new user
  const newUser = new User({
    method: 'facebook',
    facebook: {
      id: Math.floor(100000000 + Math.random() * 900000000),
      email: 'test email',
      firstName: req.body.first,
      lastName: req.body.last,
    },
    profilePicture: './placeholder.png',
    created: new Date(),
    active: true,
    relationship_status: 'single',
  });

  newUser.save((err) => {
    if (err) return res.status(500);
    res.status(201).send('user created');
  });
});

// GET LIST of a users posts
router.get('/:id/posts', checkFriend, (req, res) => {
  // only return posts if they belong to the user OR a friend of the user
  if (req.friends.includes(req.params.id) || req.user._id === req.params.id) {
    Post.find({ user: req.params.id })
      .populate('user', 'profilePicture facebook.firstName facebook.lastName')
      .sort({ created: 'desc' })
      .exec(((err, data) => {
      // handling db error
        if (err) { res.status(500).send(err); }
        res.status(200).json(data);
      }));
  } else {
    res.status(403);
  }
});

router.get('/myposts', (req, res) => {
  // set pagination info
  const resultsPerPage = 10;
  let page = req.query.page >= 1 ? req.query.page : 1;
  page -= 1;

  Post.find({ user: req.user._id })
    .sort({ created: 'desc' })
    .limit(resultsPerPage)
    .skip(resultsPerPage * page)
    .populate('user', 'profilePicture facebook.firstName facebook.lastName')
    .exec(((err, data) => {
      // handling db error
      if (err) { res.status(500).send(err); }
      res.status(200).json(data);
    }));
});

// CREATE a new friend request
router.post('/:id/request', (req, res) => {
  // construct new request object
  const newRequest = new Request({
    issuer: req.user._id,
    recipient: req.params.id,
    created: new Date(),
    status: 'pending',
  });

  // check if request already exists
  Request.findOne({ issuer: req.user._id, recipient: req.params.id })
    .exec((err, foundRequest) => {
      if (err) return res.status(500);

      // if req already exits
      if (foundRequest) {
        // req exists, return a 409
        return res.status(409).send('Friend request already exists');
      }

      newRequest.save((requestErr) => {
        if (requestErr) { return res.status(requestErr); }

        res.status(201).send('Friend request sent');
      });
    });
});

// REMOVE a friend req
router.delete('/request/:id', (req, res) => {
  // GET request first to check if current user is authorised to delete the friend req
  Request.findById(req.params.id)
    .exec((err, foundRequest) => {
      if (err) return res.status(500);

      if (foundRequest) {
        if ((req.user._id == foundRequest.issuer || req.user._id == foundRequest.recipient) && foundRequest.status === 'pending') {
          // find user by ID and remove from db
          Request.findByIdAndDelete(req.params.id, (deleteErr) => {
            // handling db error
            if (deleteErr) res.status(500).send(deleteErr);
            // if successful
            res.status(202).send('Request removed');
          });
        } else {
          // if user is not authorised to delete friend req
          res.status(401).send('not authorised to delete request');
        }
      } else {
        res.status(404).send('unable to find friend request');
      }
    });
});

// ACCEPT a friend request
router.put('/request/:id', (req, res) => {
  // GET request first to check if current user is authorised to accept the friend req
  Request.findById(req.params.id)
    .exec((err, foundRequest) => {
      if (err) return res.status(500);

      if (foundRequest) {
        if (req.user._id == foundRequest.recipient && foundRequest.status === 'pending') {
          // find user by ID and remove from db
          const filter = { _id: req.params.id };
          const doc = { $set: { status: 'accepted' } };
          const options = { new: true };

          Request.findOneAndUpdate(filter, doc, options, (updateErr, newDoc) => {
            // handling db error
            if (updateErr) res.status(500).send(updateErr);

            // if updated, return new updated status
            res.status(200).send(newDoc.status);
          });
        } else {
          // if user is not authorised to accept friend req
          res.status(401).send('not authorised to accept request');
        }
      } else {
        res.status(404).send('unable to find friend request');
      }
    });
});

// GET ALL friend requests as recipient & issuer
router.get('/request', (req, res) => {
  // async requests for both request as recipient & issuer
  async.parallel({
    recipient_requests(callback) {
      Request.find({ recipient: req.user._id, status: 'pending' })
        .populate('issuer', 'profilePicture facebook.firstName facebook.lastName')
        .exec(callback);
    },
    issuer_requests(callback) {
      Request.find({ issuer: req.user._id, status: 'pending' })
        .populate('recipient', 'profilePicture facebook.firstName facebook.lastName')
        .exec(callback);
    },
  }, (err, results) => {
    if (err) return res.status(500).send(err);

    res.json(results);
  });
});

// GET friend requests as recipient AND issuer for particular user
router.get('/:id/request', (req, res) => {
  // async requests for both request as recipient AND issuer
  async.parallel({
    recipient_requests(callback) {
      Request.find({ recipient: req.user._id, issuer: req.params.id })
        .exec(callback);
    },
    issuer_requests(callback) {
      Request.find({ issuer: req.user._id, recipient: req.params.id })
        .exec(callback);
    },
  }, (err, results) => {
    if (err) return res.status(500).send(err);

    res.json(results);
  });
});

// GET all the User ID's of users friends
router.get('/friendsId', checkFriend, (req, res) => {
  res.status(200).json(req.friends);
});

// GET all users
router.get('/users', (req, res) => {
  User.find()
    .select('-active -facebook.id -facebook.email')
    .sort({ created: 'desc' })
    .exec(((err, data) => {
      // handling db error
      if (err) { res.status(500).send(err); }
      res.status(200).json(data);
    }));
});

// GET user info by user ID
router.get('/:id', checkFriend, (req, res) => {
  User.findById(req.params.id)
    .select('-active -facebook.id -facebook.email')
    .exec((err, data) => {
      if (err) { res.status(500).send(err); }
      if (data) {
        const dataCopy = { ...data.toObject() };
        dataCopy.isFriends = req.friends.includes(req.params.id);
        res.status(200).json(dataCopy);
      } else {
        res.status(400);
      }
    });
});

module.exports = router;