const mongoose = require('mongoose');
const {Schema} = mongoose;

const CommentLikesModel = new Schema(
    {
        comment: {type: Schema.Types.ObjectId, required: true},
        user: {type: Schema.Types.ObjectId, required: true},
        created: {type: Date, required: true},

    },
);

module.exports = mongoose.model('CommentLikes', CommentLikesModel);