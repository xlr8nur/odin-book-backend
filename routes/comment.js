/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const { body, validationResult } = require('express-validator');
const async = require('async');
const Comment = require('../models/commentModel');
const CommentLike = require('../models/commentLikesModel');

const router = express.Router();

// GET comments from a post
router.get('/', (req, res) => {
  if (!req.query.postId) { return res.status(400).send('postId must be provided'); }
  if (req.query.postId.length < 1) { return res.status(400).send('postID must be provided'); }

  const postId = escape(req.query.postId);

  Comment.find({ post: postId })
    .populate('user', 'profilePicture facebook.firstName facebook.lastName')
    .sort({ created: 'asc' })
    .exec((err, data) => {
      // handling db error
      if (err) { res.status(500).send(err); }
      res.status(200).json(data);
    });
});

// POST new comment
router.post('/', [
  // validate and sanitise fields
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content must be specified')
    .isLength({ max: 1000 })
    .withMessage('Content exceeds maximum length, 1,000 characters')
    .escape(),

  body('postId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('PostId must be specified')
    .isLength({ max: 1000 })
    .withMessage('PostId exceeds maximum length, 1,000 characters')
    .escape(),

  (req, res) => {
    // extract validation errors from a req
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json(validationErrors);
    } else {
      // if no validation errors then
      const newComment = new Comment({
        user: req.user._id,
        created: new Date(),
        content: req.body.content,
        post: req.body.postId,
      });

      newComment.save((err) => {
        if (err) return res.status(500);
        res.status(201).send('comment submitted');
      });
    }
  },
]);

// DELETE comment
router.delete('/:id', (req, res) => {
  // find comment by id
  Comment.findById(req.params.id, (err, commentResult) => {
    if (err) { return res.status(500).send(err); }

    if (commentResult) {
      // if comment found
      if (req.user._id === commentResult.user.toString()) {
        Comment.findByIdAndDelete(req.params.id, (deleteErr) => {
          // handling db error
          if (deleteErr) res.status(500).send(deleteErr);
          // if successful
          res.status(202).send('Comment removed');
        });
      } else {
        res.status(401).send('not a correct user');
      }
    } else {
      res.status(404).send('unable to find comment');
    }
  });
});

// like/unlike a comment

router.post('/:id/like', (req, res) => {
  // if no validation errors then
  const newLIkeComment = new CommentLike({
    user: req.user._id,
    created: new Date(),
    comment: req.params.id,
  });

  CommentLike.findOne({ user: req.user._id, comment: req.params.id })
    .exec((err, commentLIkeResult) => {
      if (err) { return res.status(500).send(err); }
      if (commentLIkeResult) {
        CommentLike.findByIdAndDelete(commentLIkeResult._id, (deleteErr) => {
          // handling db error
          if (deleteErr) res.status(500).send(deleteErr);
          // if successful
          res.status(202).send('unliked');
        });
      } else {
        newLIkeComment.save((likeErr) => {
          if (likeErr) return res.status(500);
          res.status(201).send('like submitted');
        });
      }
    });
});

router.get('/:id/info', (req, res) => {
  async.parallel({
    like_count(callback) {
      CommentLike.countDocuments({ comment: req.params.id }, callback);
    },
    is_liked(callback) {
      // find if comment is liked by the current user
      CommentLike.findOne({ user: req.user._id, comment: req.params.id }, callback);
    },
  }, (err, results) => {
    if (err) { return res.status(500).send(err); }
    res.json(results);
  });
});

module.exports = router;