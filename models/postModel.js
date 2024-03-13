const mongoose = require('mongoose');
const {DateTime} = require('luxon');

const {Schema} = mongoose;

const PostSchema = new Schema(
  {
    content: {type: String, required: true},
    user: {type: Schema.Types.ObjectId, ref: 'user', required: true},
    created: {type: Date, required: true},
    image: {type: String, required: false},
  }, {
    toJSON: { virtuals: true },
  },
);

PostSchema
  .virtual('createdFormat')
  .get(function cb() {
    return DateTime.fromJSDate(this.created).toLocaleString(DateTime.DATE_MED);
  });


module.exports = mongoose.model('Post', PostSchema);