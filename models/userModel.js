const mongoose = require('mongoose');
const {DateTime} = require('luxon');

const {Schema} = mongoose;

const UserSchema = new Schema(
  {
    method: {type: String, required: true},
    facebook: {
      id: {type: String, required: true},
      email: {type: String, required: true},
      firstName: {type: String, required: true},
      lastName: {type: String, required: true},
    },
    profilePicture: {type: String},
    created: {type: Date, required: true},
    active: {type: Boolean, required: true},
    relationshipStatus: {type: String, required: true},
  }, {
    toJSON: {virtuals: true},
  },
);

UserSchema
  .virtual('createdFormat')
  .get(function cb() {
    return DateTime.fromJSDate(this.created).toLocaleString(DateTime.DATE_MED);
  });

// Export model
module.exports = mongoose.model('user', UserSchema);