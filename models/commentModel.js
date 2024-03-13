const mongoose = require('mongoose');
const {Schema} = mongoose;

const CommentSchema = new Schema(
    {
        post: {type: Schema.Types.ObjectId, required: true},
        user: {type: Schema.Types.ObjectId, ref: 'user', required: true},
        created: {type: Date, require: true},
        content: {type: String, required: true, maxLength: 1000},
    },
);

module.exports = mongoose.model('Comments', CommentSchema);