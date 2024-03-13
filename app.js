/* eslint-disable no-console */
// Package imports

require('./passport');
require('dotenv').config();
const path = require('path');
const cors = require('cors');
const logger = require('morgan');
const helmet = require('helmet');
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const mongoDB = process.env.MONGO_ADDRESS;
mongoose.connect(mongoDB, {useUnifiedTopology: true, useNewUrlParser: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

// import routes
const indexRouter = require('./routes/index');
const auth = require('./routes/auth');
const user = require('./routes/user');
const post = require('./routes/post');
const comment = require('./routes/comment');
const errorRoute = require('./routes/error');
const s3 = require('./routes/s3');

// express app
const app = express();

//middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize());
app.use(compression());
app.use(helmet());

// config cors
const corsOptions = {
    origin: ['https://xlr8nur.github.io/odin-book'],
    optionsSucsessStatus: 200,
};

app.use(cors(corsOptions));

// Define routes
app.use('/un', indexRouter); // Unprotected routes
// Login via jwt auth + sign up route
app.use('/auth', auth);
// user routes protected by jwt authentication
app.use('/user', passport.authenticate('jwt', { session: false }), user);
// post routes protected by jwt authentication
app.use('/post', passport.authenticate('jwt', { session: false }), post);
// comment routes protected by jwt authentication
app.use('/comment', passport.authenticate('jwt', { session: false }), comment);
// handling error
app.use('/error', passport.authenticate('jwt', { session: false }), errorRoute);
// handling multimedia
app.use('/s3', passport.authenticate('jwt', { session: false }), s3);

app.use((req, res) => {
  res.status(404).send('route not found');
});

module.exports = app;