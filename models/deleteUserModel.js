const mongoose = require('mongoose');

const {Schema} = mongoose;

const DeleteUserSchema = new Schema(
  {
    user: {type: Schema.Types.ObjectId, ref: 'user', required: true},
    created: {type: Date, required: true},
    actioned: {type: Boolean, required: true},
  },
);


module.exports = mongoose.model('DeleteUser', DeleteUserSchema);