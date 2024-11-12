import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../App';

function TaskPage() {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamTasks, setTeamTasks] = useState({});
  const [taskText, setTaskText] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('personal');
  const [assignees, setAssignees] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [priority, setPriority] = useState('low');
  const [dueDate, setDueDate] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const socket = useContext(SocketContext);

  const fetchTasks = useCallback(() => {
    axios.get('http://localhost:5000/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      const groupedTasks = {};
      response.data.forEach(task => {
        const teamId = task.team?._id || 'personal';
        if (!groupedTasks[teamId]) groupedTasks[teamId] = [];
        groupedTasks[teamId].push(task);
      });
      setTasks(response.data);
      setTeamTasks(groupedTasks);
    }).catch(error => console.error('Error fetching tasks:', error));
  }, [token]);

  const fetchTeams = useCallback(() => {
    axios.get('http://localhost:5000/teams', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(response => {
      setTeams([{ _id: 'personal', name: 'Personal Task' }, ...response.data.teams]);
    }).catch(error => console.error('Error fetching teams:', error));
  }, [token]);

  useEffect(() => {
    fetchTeams();
    fetchTasks();

    if (socket) {
      socket.on('taskCreated', fetchTasks);
      socket.on('taskDeleted', fetchTasks);
      socket.on('taskUpdated', fetchTasks);
      socket.on('teamDeleted', fetchTeams);
      socket.on('teamUpdated', fetchTeams);
      socket.on('inviteAccepted', fetchTeams);
      socket.on('leaveTeam', fetchTeams);
    }

    return () => {
      socket?.off('taskCreated', fetchTasks);
      socket?.off('taskDeleted', fetchTasks);
      socket?.off('taskUpdated', fetchTasks);
      socket?.off('teamDeleted', fetchTeams);
      socket?.off('teamUpdated', fetchTeams);
      socket?.off('inviteAccepted', fetchTeams);
      socket?.off('leaveTeam', fetchTeams);
    };
  }, [socket, fetchTasks, fetchTeams]);

  const handleCreateOrUpdateTask = () => {
    if (!taskText || !dueDate) {
      alert("Please enter task text and due date.");
      return;
    }

    const taskData = {
      text: taskText,
      description,
      teamId: selectedTeam === 'personal' ? null : selectedTeam,
      assignees: selectedTeam === 'personal' ? [userId] : selectedAssignees,
      priority,
      dueDate,
      isPersonal: selectedTeam === 'personal'
    };

    const request = editingTask
      ? axios.put(`http://localhost:5000/update-task/${editingTask._id}`, taskData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      : axios.post('http://localhost:5000/add-task', taskData, {
          headers: { Authorization: `Bearer ${token}` }
        });

    request.then(() => {
      fetchTasks();
      resetForm();
    }).catch(error => console.error(editingTask ? "Error updating task:" : "Error adding task:", error));
  };

  const handleDeleteTask = (taskId) => {
    axios.delete(`http://localhost:5000/delete-task/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => fetchTasks())
      .catch(error => console.error("Error deleting task:", error));
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskText(task.text);
    setDescription(task.description);
    setSelectedTeam(task.team ? task.team._id : 'personal');
    setSelectedAssignees(task.assignees.map(assignee => assignee._id));
    setPriority(task.priority);
    setDueDate(task.dueDate.slice(0, 10));
  };

  const resetForm = () => {
    setTaskText('');
    setDescription('');
    setSelectedTeam('personal');
    setSelectedAssignees([]);
    setPriority('low');
    setDueDate('');
    setEditingTask(null);
  };

  const handleAssigneeChange = (event) => {
    const { options } = event.target;
    const selectedValues = Array.from(options)
      .filter(option => option.selected)
      .map(option => option.value);

    setSelectedAssignees(selectedValues.includes('all') ? assignees.map(member => member._id) : selectedValues);
  };

  useEffect(() => {
    if (selectedTeam && selectedTeam !== 'personal') {
      const team = teams.find(team => team._id === selectedTeam);
      if (team) setAssignees(team.members);
    } else {
      setAssignees([]);
    }
  }, [selectedTeam, teams]);

  return (
    <div>
      <h2>Tasks</h2>

      <div>
        <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
        <input
          type="text"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="Task Title"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task Description"
        />

        <select onChange={(e) => {
          const teamSelection = e.target.value;
          setSelectedTeam(teamSelection);
          setSelectedAssignees(teamSelection === 'personal' ? [userId] : []);
        }} value={selectedTeam}>
          {teams.map(team => (
            <option key={team._id} value={team._id}>{team.name}</option>
          ))}
        </select>

        {selectedTeam !== 'personal' && (
          <select multiple onChange={handleAssigneeChange}>
            <option value="all">All Team Members</option>
            {assignees.map(member => (
              <option key={member._id} value={member._id}>{member.username}</option>
            ))}
          </select>
        )}

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="very high">Very High</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button onClick={handleCreateOrUpdateTask}>{editingTask ? 'Update Task' : 'Add Task'}</button>
      </div>

      <h3>All Tasks</h3>
      {Object.keys(teamTasks).map(teamId => (
        <div key={teamId}>
          <h4>{teamId === 'personal' ? 'Personal Tasks' : teams.find(team => team._id === teamId)?.name}</h4>
          <ul>
            {teamTasks[teamId]?.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(task => (
              <li key={task._id}>
                <div>
                  <strong>{task.text}</strong>
                </div>
                {task.description && <p>{task.description}</p>}
                {!task.isCompleted && (
                  <>
                    <span>Priority: {task.priority}</span>
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  </>
                )}
                <button onClick={() => handleEditTask(task)}>Edit</button>
                <button onClick={() => handleDeleteTask(task._id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default TaskPage;
