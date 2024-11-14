// backend/models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  text: { type: String, required: true }, // Task description or title
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Creator
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // Optional team association
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Assigned users
  priority: { type: String, enum: ['low', 'medium', 'high', 'very high'], required: true }, // Priority level
  dueDate: { type: Date, required: true }, // Task due date
  status: { type: String, enum: ['not started', 'in progress', 'completed'], default: 'not started' }, // Status
  isPersonal: { type: Boolean, default: false }, // Indicates if this is a personal task
  description: { type: String }, // Optional detailed description
  isCompleted: { type: Boolean, default: false }, // Indicates if the task is completed
});

module.exports = mongoose.model('Task', taskSchema);
