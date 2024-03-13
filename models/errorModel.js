const mongoose = require('mongoose');

const {Schema} = mongoose;

const ErrorSchema = new Schema(
    {
        content: {type: String, required: true},
        user: {type: Schema.Types.ObjectId, ref: 'user', required: true},
        created: {type: Date, required: true},
    },
);

module.exports = mongoose.model('ErrorModel', ErrorSchema);