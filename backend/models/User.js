// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10; // Ensure this matches the SALT_ROUNDS in your main application

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }, // Added unique constraint
  email: { type: String, required: true, unique: true },    // Added unique constraint
  password: { type: String, required: true },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teamInvites: [
    {
      team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  ]
});

// Adjusted pre-save hook to hash password only when it's new or modified
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
