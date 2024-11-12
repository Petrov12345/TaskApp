// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teamInvites: [
    {
      team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  ]
});

module.exports = mongoose.model('User', userSchema);
