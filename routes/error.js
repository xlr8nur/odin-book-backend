/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
const express = require('express');
const { body, validationResult } = require('express-validator');
const ErrorModal = require('../models/errorModel');

const router = express.Router();

// Get paginated POSTs of current friends
router.post('/', [
  // validate and sanitise fields
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content must be specified')
    .isLength({ max: 60000 })
    .withMessage('Content exceeds maximum length, 60,000 characters')
    .escape(),

  // process request
  (req, res) => {
    // extract the validation errors from a request.
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
      res.status(400).json(validationErrors);
    } else {
      // if no validation errors then
      const newError = new ErrorModal({
        user: req.user._id,
        created: new Date(),
        content: req.body.content,
      });

      newError.save((err) => {
        if (err) return res.status(500);
        res.status(201).send('error submitted');
      });
    }
  },
]);

module.exports = router;