/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const { body, validationResult } = require('express-validator');
const async = require('async');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const PostLike = require('../models/postLikesModel');
const { checkFriend } = require('../helpers/helpers');

const router = express.Router();

// GET paginated posts of current frens
router.get('/', checkFriend, (req, res) => {
  const resultsPerPage = 10;
  let page = req.query.page >= 1 ? req.query.page : 1;
  page -= 1;

  Post.find({ user: { $in: req.friends } })
    .sort({ created: 'desc' })
    .limit(resultsPerPage)
    .skip(resultsPerPage * page)
    .populate('user', 'profilePicture facebook.firstName facebook.lastName')
    .exec(((err, data) => {
      //handling db error
      if (err) { res.status(500).send(err); }
      res.status(200).json(data);
    }));
});

// CREATE new post
router.post('/', [
  // validate and sanitise fields
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content must be specified')
    .isLength({ max: 60000 })
    .withMessage('Content exceeds maximum length, 60,000 characters')
    .escape(),

  body('image')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('image path exceeds maximum length'),

  // Process request
  (req, res) => {
    // extract the validation errors from a req
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json(validationErrors);
    } else {
      // if no validation errors
      const newPost = new Post({
        user: req.user._id,
        created: new Date(),
        content: req.body.content,
        image: req.body.image,
      });

      newPost.save((err) => {
        if (err) return res.status(500);
        res.status(201).send('post submitted');
      });
    }
  },
]);

// Like/Unlike a post

router.post('/:id/like', (req, res) => {
  // if no validation errors
  const newLikePost = new PostLike({
    user: req.user._id,
    created: new Date(),
    post: req.params.id,
  });

  PostLike.findOne({ user: req.user._id, post: req.params.id })
    .exec((err, postLikeResult) => {
      if (err) { return res.status(500).send(err); }
      if (postLikeResult) {
        PostLike.findByIdAndDelete(postLikeResult._id, (deleteErr) => {
          // handling db error
          if (deleteErr) res.status(500).send(deleteErr);
          // if successful
          res.status(202).send('unliked');
        });
      } else {
        newLikePost.save((likeErr) => {
          if (likeErr) return res.status(500);
          res.status(201).send('like submitted');
        });
      }
    });
});

// GET specific post
router.get('/:id', checkFriend, (req, res) => {
  // find post by id
  Post.findById(req.params.id, (err, postResult) => {
    if (err) { return res.status(500).send(err); }

    if (postResult) {
      // if post found
      if (req.friends.includes(postResult.user) || req.user._id === postResult.user.toString()) {
        // return data only if poster is a friend of the current user or belongs to a current user
        res.json(postResult);
      } else {
        res.status(401).send('not a friend');
      }
    } else {
      res.status(404).send('unable to find post');
    }
  });
});

// GET specific post info (comment & like numbers)
router.get('/:id/info', checkFriend, (req, res) => {
  async.parallel({
    comment_count(callback) {
      Comment.countDocuments({ post: req.params.id }, callback);
    },
    like_count(callback) {
      PostLike.countDocuments({ post: req.params.id }, callback);
    },
    is_liked(callback) {
      // find if post is liked by the current user
      PostLike.findOne({ user: req.user._id, post: req.params.id }, callback);
    },
  }, (err, results) => {
    if (err) { return res.status(500).send(err); }
    res.json(results);
  });
});

// DELETE specific post
router.delete('/:id', (req, res) => {
  // find post by id
  Post.findById(req.params.id, (err, postResult) => {
    if (err) { return res.status(500).send(err); }

    if (postResult) {
      // if post found
      if (req.user._id === postResult.user.toString()) {
        Post.findByIdAndDelete(req.params.id, (deleteErr) => {
          // handling db error
          if (deleteErr) res.status(500).send(deleteErr);
          // if successful
          res.status(202).send('Post removed');
        });
      } else {
        res.status(401).send('not correct user');
      }
    } else {
      res.status(404).send('unable to find post');
    }
  });
});

module.exports = router;