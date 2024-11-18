const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingInvites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Add pendingInvites field
});

module.exports = mongoose.model('Team', teamSchema);
