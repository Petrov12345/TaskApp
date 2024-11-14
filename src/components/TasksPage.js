import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { SocketContext } from '../App';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import '../CSS-Style/Taskpage.css';

dayjs.extend(utc);
dayjs.extend(timezone);

function TaskPage() {
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('personal');
  const [assignees, setAssignees] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [priority, setPriority] = useState('low');
  const [dueDate, setDueDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dueTime, setDueTime] = useState(dayjs().format('HH:mm'));
  const [editingTask, setEditingTask] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [hasScrolledToLocationTask, setHasScrolledToLocationTask] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const socket = useContext(SocketContext);
  const location = useLocation();
  const taskRefs = useRef({});

  const scrollToTask = (taskId) => {
    if (highlightedTaskId) {
      const previousElement = taskRefs.current[highlightedTaskId];
      if (previousElement) previousElement.classList.remove('highlight');
    }

    const taskElement = taskRefs.current[taskId];
    if (taskElement) {
      setHighlightedTaskId(taskId);
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      taskElement.classList.add('highlight');
      setTimeout(() => taskElement.classList.remove('highlight'), 1500);
    }
  };

  const fetchTasks = useCallback(() => {
    axios
      .get('http://localhost:5000/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setTasks(response.data);
      })
      .catch((error) => console.error('Error fetching tasks:', error));
  }, [token]);

  const fetchTeams = useCallback(() => {
    axios
      .get('http://localhost:5000/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setTeams([{ _id: 'personal', name: 'Personal Task' }, ...response.data.teams]);
      })
      .catch((error) => console.error('Error fetching teams:', error));
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

  useEffect(() => {
    if (!hasScrolledToLocationTask && location.state?.taskId && tasks.length > 0) {
      scrollToTask(location.state.taskId);
      setHasScrolledToLocationTask(true);
    }
  }, [hasScrolledToLocationTask, location.state, tasks]);

  const handleCreateOrUpdateTask = () => {
    if (!taskText || !dueDate || !dueTime) {
      alert('Please enter task text, due date, and due time.');
      return;
    }

    const dueDateTimeString = `${dueDate}T${dueTime}`;
    const dueDateTime = dayjs.tz(dueDateTimeString, dayjs.tz.guess()).toISOString();

    const taskData = {
      text: taskText,
      description,
      teamId: selectedTeam === 'personal' ? null : selectedTeam,
      assignees: selectedTeam === 'personal' ? [userId] : selectedAssignees,
      priority,
      dueDate: dueDateTime,
      isPersonal: selectedTeam === 'personal',
      isCompleted,
    };

    const request = editingTask
      ? axios.put(`http://localhost:5000/update-task/${editingTask._id}`, taskData, {
          headers: { Authorization: `Bearer ${token}` },
        })
      : axios.post('http://localhost:5000/add-task', taskData, {
          headers: { Authorization: `Bearer ${token}` },
        });

    request
      .then((response) => {
        fetchTasks();
        resetForm();

        const updatedTaskId = editingTask ? editingTask._id : response.data._id;
        scrollToTask(updatedTaskId);
        setHasScrolledToLocationTask(true);
      })
      .catch((error) =>
        console.error(editingTask ? 'Error updating task:' : 'Error adding task:', error)
      );
  };

  const handleDeleteTask = (taskId) => {
    axios
      .delete(`http://localhost:5000/delete-task/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        fetchTasks();
        if (highlightedTaskId === taskId) {
          setHighlightedTaskId(null);
        }
      })
      .catch((error) => console.error('Error deleting task:', error));
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskText(task.text);
    setDescription(task.description);
    setSelectedTeam(task.team ? task.team._id : 'personal');
    setSelectedAssignees(task.assignees.map((assignee) => assignee._id));
    setPriority(task.priority);
    setDueDate(dayjs(task.dueDate).format('YYYY-MM-DD'));
    setDueTime(dayjs(task.dueDate).format('HH:mm'));
    setIsCompleted(task.isCompleted || false);

    scrollToTask(task._id);
  };

  const resetForm = () => {
    setTaskText('');
    setDescription('');
    setSelectedTeam('personal');
    setSelectedAssignees([]);
    setPriority('low');
    setDueDate(dayjs().format('YYYY-MM-DD'));
    setDueTime(dayjs().format('HH:mm'));
    setEditingTask(null);
    setIsCompleted(false);
  };

  const handleAssigneeChange = (event) => {
    const { options } = event.target;
    const selectedValues = Array.from(options)
      .filter((option) => option.selected)
      .map((option) => option.value);

    if (selectedValues.includes('all')) {
      setSelectedAssignees(assignees.map((member) => member._id));
    } else {
      setSelectedAssignees(selectedValues);
    }
  };

  useEffect(() => {
    if (selectedTeam && selectedTeam !== 'personal') {
      const team = teams.find((team) => team._id === selectedTeam);
      if (team) setAssignees(team.members);
    } else {
      setAssignees([]);
      setSelectedAssignees([userId]);
    }
  }, [selectedTeam, teams, userId]);

  const handleToggleComplete = (task) => {
    axios
      .put(
        `http://localhost:5000/update-task/${task._id}`,
        {
          isCompleted: !task.isCompleted,
          completedAt: !task.isCompleted ? new Date() : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => fetchTasks())
      .catch((error) => console.error('Error updating task:', error));
  };

  // Helper functions to filter and sort tasks
  const incompleteTasks = tasks
    .filter((task) => !task.isCompleted)
    .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));

  const completedTasks = tasks
    .filter((task) => task.isCompleted)
    .sort((a, b) => dayjs(b.completedAt).diff(dayjs(a.completedAt)));

  return (
    <div className="task-page">
      <h2>Tasks</h2>

      <div className="task-form">
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

        <select
          onChange={(e) => {
            const teamSelection = e.target.value;
            setSelectedTeam(teamSelection);
            setSelectedAssignees(teamSelection === 'personal' ? [userId] : []);
          }}
          value={selectedTeam}
          disabled={editingTask !== null} // Disable changing team when editing
        >
          {teams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>

        {selectedTeam !== 'personal' && (
          <select multiple onChange={handleAssigneeChange} value={selectedAssignees}>
            <option value="all">All Team Members</option>
            {assignees.map((member) => (
              <option key={member._id} value={member._id}>
                {member.username}
              </option>
            ))}
          </select>
        )}

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="very high">Very High</option>
        </select>

        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />

        <label>
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
          />
          Task Completed
        </label>

        <button onClick={handleCreateOrUpdateTask}>
          {editingTask ? 'Update Task' : 'Add Task'}
        </button>
        {editingTask && <button onClick={resetForm}>Cancel Editing Task</button>}
      </div>

      <h3>All Tasks</h3>
      <ul className="task-list">
        {incompleteTasks.map((task) => {
          const taskTeam =
            task.isPersonal || !task.team
              ? null
              : teams.find((team) => team._id === task.team._id);
          const taskTeamMembers = taskTeam ? taskTeam.members : [];

          return (
            <li
              key={task._id}
              ref={(el) => (taskRefs.current[task._id] = el)}
              className={`task-item ${highlightedTaskId === task._id ? 'highlight' : ''}`}
            >
              <div>
                <strong>{task.text}</strong>
              </div>
              {task.description && <p>{task.description}</p>}
              <span>
                Team:{' '}
                {task.isPersonal
                  ? 'Personal'
                  : taskTeam?.name || 'Unknown Team'}
              </span>
              <span>Priority: {task.priority}</span>
              <span>Due: {dayjs(task.dueDate).local().format('MM/DD/YYYY HH:mm')}</span>
              {/* Display Assigned Members */}
              {task.isPersonal ? (
                <span>Assigned to: You</span>
              ) : (
                <span>
                  Assigned to:{' '}
                  {task.assignees.length === taskTeamMembers.length
                    ? 'All'
                    : task.assignees.map((assignee) => assignee.username).join(', ')}
                </span>
              )}
              <div className="task-actions">
                <button onClick={() => handleEditTask(task)}>Edit</button>
                <button onClick={() => handleDeleteTask(task._id)}>Delete</button>
                <button onClick={() => handleToggleComplete(task)}>Mark Complete</button>
              </div>
            </li>
          );
        })}
      </ul>

      <h3>Completed Tasks</h3>
      <ul className="task-list">
        {completedTasks.map((task) => {
          const taskTeam =
            task.isPersonal || !task.team
              ? null
              : teams.find((team) => team._id === task.team._id);
          const taskTeamMembers = taskTeam ? taskTeam.members : [];

          return (
            <li
              key={task._id}
              ref={(el) => (taskRefs.current[task._id] = el)}
              className={`task-item completed-task ${
                highlightedTaskId === task._id ? 'highlight' : ''
              }`}
            >
              <div>
                <strong>{task.text}</strong>
              </div>
              {task.description && <p>{task.description}</p>}
              <span>
                Team:{' '}
                {task.isPersonal
                  ? 'Personal'
                  : taskTeam?.name || 'Unknown Team'}
              </span>
              <span>Priority: {task.priority}</span>
              <span>Due: {dayjs(task.dueDate).local().format('MM/DD/YYYY HH:mm')}</span>
              {task.completedAt && (
                <span>
                  Completed: {dayjs(task.completedAt).local().format('MM/DD/YYYY HH:mm')}
                </span>
              )}
              {/* Display Assigned Members */}
              {task.isPersonal ? (
                <span>Assigned to: You</span>
              ) : (
                <span>
                  Assigned to:{' '}
                  {task.assignees.length === taskTeamMembers.length
                    ? 'All'
                    : task.assignees.map((assignee) => assignee.username).join(', ')}
                </span>
              )}
              <div className="task-actions">
                <button onClick={() => handleEditTask(task)}>Edit</button>
                <button onClick={() => handleDeleteTask(task._id)}>Delete</button>
                <button onClick={() => handleToggleComplete(task)}>Mark Incomplete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default TaskPage;
