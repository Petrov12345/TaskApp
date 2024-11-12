// server.js
const express = require('express');
const http = require('http'); // Needed for Socket.IO
const socketIo = require('socket.io'); // Import socket.io
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Task = require('./models/Task');
const Team = require('./models/Team');

dotenv.config();
const app = express();
const server = http.createServer(app); // Create server for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
}); // Initialize Socket.IO
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect('mongodb://localhost:27017/taskDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.log(err));

const JWT_SECRET = 'your_jwt_secret'; // Replace with a secure secret

// Middleware to authenticate JWT and get the user ID
const authenticateUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).send('Invalid token');
  }
};

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    return next(new Error('Authentication error'));
  }
});

// Socket.IO Connection
io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`User connected: ${userId}`);

  // Join the user-specific room
  socket.join(userId);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
  });
});

// Signup route
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.status(201).send('User created successfully');
    io.emit('dataUpdated'); // Emit update event
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).send('Error creating user');
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: '1h',
      });
      res.send({
        success: true,
        token,
        username: user.username,
        userId: user._id,
      });
    } else {
      res.status(401).send({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ success: false, message: 'Login failed' });
  }
});

// Task Routes

// Create a new task
app.post('/add-task', authenticateUser, async (req, res) => {
  const { text, description, teamId, assignees, priority, dueDate, isPersonal } = req.body;
  try {
    const taskData = {
      text,
      description,
      userId: req.userId,
      priority,
      dueDate,
      isPersonal: isPersonal || false,
      status: 'not started',
      isCompleted: false, // Initialize as not completed
    };

    if (teamId && teamId !== 'personal') {
      taskData.team = teamId;
    }

    if (assignees && assignees.length > 0) {
      taskData.assignees = assignees;
    }

    const task = new Task(taskData);
    await task.save();
    res.send(task);

    // Emit task creation event to relevant users
    const recipientIds = new Set();
    if (task.assignees) {
      task.assignees.forEach((id) => recipientIds.add(id.toString()));
    }
    if (task.team) {
      const team = await Team.findById(task.team);
      team.members.forEach((id) => recipientIds.add(id.toString()));
    }
    recipientIds.add(req.userId); // Include the creator

    recipientIds.forEach((userId) => {
      io.to(userId).emit('taskCreated', task);
    });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(400).send('Error adding task');
  }
});

// Get all tasks for the authenticated user
app.get('/tasks', authenticateUser, async (req, res) => {
  try {
    // Find teams the user is currently a member of
    const userTeams = await Team.find({ members: req.userId }).select('_id');
    const teamIds = userTeams.map((team) => team._id);

    // Find tasks assigned to the user or to their current teams
    const tasks = await Task.find({
      $or: [
        { userId: req.userId }, // Personal tasks created by the user
        { assignees: req.userId }, // Tasks directly assigned to the user
        { team: { $in: teamIds } }, // Tasks associated with teams the user is currently a member of
      ],
    })
      .populate('team', 'name')
      .populate('assignees', 'username')
      .populate('userId', 'username')
      .sort({ isCompleted: 1, dueDate: 1 }); // Sort by completion status and due date

    res.send(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(400).send('Error fetching tasks');
  }
});

// Delete a task
app.delete('/delete-task/:id', authenticateUser, async (req, res) => {
  const taskId = req.params.id;
  try {
    const task = await Task.findById(taskId).populate('team', 'members');

    if (!task) return res.status(404).send('Task not found');

    // Check if the user is authorized
    const isAuthorized =
      task.userId.toString() === req.userId ||
      task.assignees.map((id) => id.toString()).includes(req.userId) ||
      (task.team && task.team.members.map((id) => id.toString()).includes(req.userId));

    if (!isAuthorized) {
      return res.status(403).send('Not authorized to delete this task');
    }

    await task.deleteOne();

    res.send({ success: true, message: 'Task deleted successfully' });

    // Emit task deletion event to relevant users
    const recipientIds = new Set();
    if (task.assignees) {
      task.assignees.forEach((id) => recipientIds.add(id.toString()));
    }
    if (task.team) {
      const team = await Team.findById(task.team);
      team.members.forEach((id) => recipientIds.add(id.toString()));
    }
    recipientIds.add(task.userId.toString());

    recipientIds.forEach((userId) => {
      io.to(userId).emit('taskDeleted', taskId);
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(400).send('Error deleting task');
  }
});

// Update a task's details
app.put('/update-task/:id', authenticateUser, async (req, res) => {
  const taskId = req.params.id;
  const { text, description, assignees, priority, dueDate, status, isCompleted } = req.body;

  try {
    const task = await Task.findById(taskId).populate('team', 'members');

    if (!task) return res.status(404).send('Task not found');

    // Check if the user is authorized
    const isAuthorized =
      task.userId.toString() === req.userId ||
      task.assignees.map((id) => id.toString()).includes(req.userId) ||
      (task.team && task.team.members.map((id) => id.toString()).includes(req.userId));

    if (!isAuthorized) {
      return res.status(403).send('Not authorized to update this task');
    }

    // Update task fields if provided in the request body
    if (text) task.text = text;
    if (description) task.description = description;
    if (assignees) task.assignees = assignees;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (status) task.status = status;
    task.isCompleted = isCompleted ?? task.isCompleted; // Update isCompleted if provided

    await task.save();

    res.send({ success: true, task });

    // Emit task update event to relevant users
    const recipientIds = new Set();
    if (task.assignees) {
      task.assignees.forEach((id) => recipientIds.add(id.toString()));
    }
    if (task.team) {
      const team = await Team.findById(task.team);
      team.members.forEach((id) => recipientIds.add(id.toString()));
    }
    recipientIds.add(task.userId.toString());

    recipientIds.forEach((userId) => {
      io.to(userId).emit('taskUpdated', task);
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).send('Error updating task');
  }
});

// Friend Management Routes

// Send a friend request
app.post('/send-friend-request', authenticateUser, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const user = await User.findById(req.userId);
    const friend = await User.findOne({ username: friendUsername });

    if (user.username === friendUsername) {
      return res.status(400).send({ error: 'You cannot add yourself as a friend' });
    }
    if (!friend) return res.status(404).send({ error: 'User does not exist' });
    if (friend.friendRequests.includes(req.userId) || friend.friends.includes(req.userId)) {
      return res.status(400).send({ error: 'Friend request already sent or user is already a friend' });
    }

    friend.friendRequests.push(req.userId);
    await friend.save();
    res.send({ success: true, message: 'Friend request sent' });

    io.to(friend._id.toString()).emit('friendRequestReceived', { from: user.username });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).send({ error: 'Error sending friend request' });
  }
});

// Respond to a friend request
app.post('/respond-friend-request', authenticateUser, async (req, res) => {
  const { requesterId, action } = req.body;
  try {
    const user = await User.findById(req.userId);
    const requester = await User.findById(requesterId);

    if (!user || !requester) return res.status(404).send('User not found');

    if (action === 'accept') {
      user.friends.push(requesterId);
      requester.friends.push(req.userId);

      // Emit event to notify the requester that their request was accepted
      io.to(requesterId.toString()).emit('friendRequestAccepted', {
        friendId: req.userId,
        friendUsername: user.username,
      });
    }

    user.friendRequests = user.friendRequests.filter((id) => id.toString() !== requesterId);
    await user.save();
    await requester.save();
    res.send({ success: true, message: `Friend request ${action}ed` });

    io.to(req.userId).emit('friendsUpdated'); // Notify the user
  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).send('Error processing friend request');
  }
});

// Get friends and friend requests
app.get('/friends', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username')
      .populate('friendRequests', 'username');

    if (!user) return res.status(404).send('User not found');

    res.send({ friends: user.friends, friendRequests: user.friendRequests });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).send('Error fetching friends');
  }
});

// Remove a friend
app.post('/remove-friend', authenticateUser, async (req, res) => {
  const { friendId } = req.body;
  try {
    const user = await User.findById(req.userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) return res.status(404).send('User not found');

    // Remove each other from friends list
    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== req.userId);

    await user.save();
    await friend.save();

    res.send({ success: true, message: 'Friend removed successfully' });
    io.to(friendId).emit('friendRemoved', { userId: req.userId });
    io.to(req.userId).emit('friendsUpdated');
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).send('Error removing friend');
  }
});

// Team Management Routes

// Create a new team
app.post('/create-team', authenticateUser, async (req, res) => {
    const { name, members = [] } = req.body;
    try {
      const existingTeam = await Team.findOne({ name, owner: req.userId });
      if (existingTeam) {
        return res.status(400).send('You already have a team with this name');
      }
  
      const newTeam = new Team({
        name,
        owner: req.userId,
        members: [req.userId], // Owner is automatically a member
        pendingInvites: members,
      });
      await newTeam.save();
      
      members.forEach((memberId) => {
        io.to(memberId).emit('teamInviteReceived', {
          teamId: newTeam._id,
          teamName: newTeam.name,
          invitedBy: req.userId,
        });
      });
  
      res.send({ success: true, team: newTeam });
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).send('Error creating team');
    }
  });
  
  // Get teams the user is a member of
  app.get('/teams', authenticateUser, async (req, res) => {
    try {
      const teams = await Team.find({ members: req.userId })
        .populate('members', 'username')
        .populate('owner', 'username');
      res.send({ teams, userId: req.userId });
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).send('Error fetching teams');
    }
  });
  
  // Get team invites for the user
  app.get('/team-invites', authenticateUser, async (req, res) => {
    try {
      const teamInvites = await Team.find({ pendingInvites: req.userId })
        .populate('owner', 'username');
      const invitesData = teamInvites.map((invite) => ({
        team: invite,
        invitedBy: invite.owner,
      }));
      res.send(invitesData);
    } catch (error) {
      console.error('Error fetching team invites:', error);
      res.status(500).send('Error fetching team invites');
    }
  });
  
  // Invite a user to a team (only the team owner can invite users)
  app.post('/invite-to-team', authenticateUser, async (req, res) => {
    const { teamId, inviteeId } = req.body;
    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).send('Team not found');
      if (team.owner.toString() !== req.userId) return res.status(403).send('Only the team owner can invite users');
  
      if (team.pendingInvites.includes(inviteeId) || team.members.includes(inviteeId)) {
        return res.status(400).send('User already invited or is a member of this team');
      }
  
      team.pendingInvites.push(inviteeId);
      await team.save();
  
      res.send({ success: true, message: 'Invite sent' });
      io.to(inviteeId).emit('teamInviteReceived', {
        teamId: team._id,
        teamName: team.name,
        invitedBy: req.userId,
      });
    } catch (error) {
      console.error('Error inviting to team:', error);
      res.status(500).send('Error inviting to team');
    }
  });
  
  // Respond to a team invite (accept or deny)
  app.post('/respond-team-invite', authenticateUser, async (req, res) => {
    const { teamId, action } = req.body;
    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).send('Team not found');
      if (!team.pendingInvites.includes(req.userId)) return res.status(400).send('Invite no longer valid');
  
      if (action === 'accept') {
        team.members.push(req.userId);
        team.pendingInvites = team.pendingInvites.filter((id) => id.toString() !== req.userId);
        await team.save();
  
        io.to(req.userId).emit('teamJoined', { teamId: team._id });
        io.to(team.owner.toString()).emit('memberJoinedTeam', { teamId: team._id, userId: req.userId });
      } else if (action === 'deny') {
        team.pendingInvites = team.pendingInvites.filter((id) => id.toString() !== req.userId);
        await team.save();
      }
  
      res.send({ success: true, message: `Invite ${action}ed successfully` });
    } catch (error) {
      console.error('Error responding to team invite:', error);
      res.status(500).send('Error processing team invite');
    }
  });
  
  // Manage a team (rename, add or remove members)
app.post('/manage-team', authenticateUser, async (req, res) => {
    const { teamId, action, name, memberId } = req.body;
    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).send('Team not found');
      if (team.owner.toString() !== req.userId) return res.status(403).send('Only the team owner can manage this team');
  
      if (action === 'rename') {
        const duplicateTeam = await Team.findOne({ name, owner: req.userId, _id: { $ne: teamId } });
        if (duplicateTeam) return res.status(400).send('You already have a team with this name');
        team.name = name;
      } else if (action === 'remove') {
        const isPendingInvite = team.pendingInvites.includes(memberId);
        team.members = team.members.filter((id) => id.toString() !== memberId);
        team.pendingInvites = team.pendingInvites.filter((id) => id.toString() !== memberId);
        await Task.updateMany({ team: teamId, assignees: memberId }, { $pull: { assignees: memberId } });
  
        // Notify the user based on their status
        if (isPendingInvite) {
          // Invite was revoked
          io.to(memberId).emit('inviteRevoked', { teamId: team._id });
        } else {
          // Member was removed from the team
          io.to(memberId).emit('removedFromTeam', { teamId: team._id });
        }
      }
  
      await team.save();
      res.send({ success: true, team });
  
      // Notify team members of the update
      team.members.forEach((memberId) => io.to(memberId.toString()).emit('teamUpdated', { teamId: team._id }));
    } catch (error) {
      console.error('Error managing team:', error);
      res.status(500).send('Error managing team');
    }
  });  
  
  // Leave a team (only if the user is not the owner)
  app.post('/leave-team', authenticateUser, async (req, res) => {
    const { teamId } = req.body;
    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).send('Team not found');
      if (team.owner.toString() === req.userId) return res.status(400).send('Team owner cannot leave their own team');
  
      team.members = team.members.filter((id) => id.toString() !== req.userId);
      await team.save();
      await Task.updateMany({ team: teamId, assignees: req.userId }, { $pull: { assignees: req.userId } });
  
      io.to(req.userId).emit('leftTeam', teamId);
      io.to(team.owner.toString()).emit('memberLeftTeam', { teamId, userId: req.userId });
      res.send({ success: true, message: 'Left the team successfully' });
    } catch (error) {
      console.error('Error leaving team:', error);
      res.status(500).send('Error leaving team');
    }
  });
  
  // Delete a team (only the team owner can delete)
  app.delete('/delete-team/:id', authenticateUser, async (req, res) => {
    const teamId = req.params.id;
    try {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).send('Team not found');
      if (team.owner.toString() !== req.userId) return res.status(403).send('Only the team owner can delete the team');
  
      await Task.deleteMany({ team: teamId });
      team.members.forEach((memberId) => io.to(memberId.toString()).emit('teamDeleted', teamId));
      await Team.findByIdAndDelete(teamId);
      res.send({ success: true, message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).send('Error deleting team');
    }
  });
  
// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
