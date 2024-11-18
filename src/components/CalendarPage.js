import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../App';
import dayjs from 'dayjs';
import '../CSS-Style/CalendarPage.css';

function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [tasks, setTasks] = useState([]);
  const token = localStorage.getItem('token');
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  const fetchTasks = useCallback(() => {
    axios
      .get('http://localhost:5000/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setTasks(response.data))
      .catch((error) => console.error('Error fetching tasks:', error));
  }, [token]);

  useEffect(() => {
    fetchTasks();

    if (socket) {
      socket.on('taskCreated', fetchTasks);
      socket.on('taskUpdated', fetchTasks);
      socket.on('taskDeleted', fetchTasks);
    }

    return () => {
      socket?.off('taskCreated', fetchTasks);
      socket?.off('taskUpdated', fetchTasks);
      socket?.off('taskDeleted', fetchTasks);
    };
  }, [socket, fetchTasks]);

  const handleMonthChange = (direction) => {
    setCurrentMonth(currentMonth.add(direction, 'month'));
  };

  const getTasksForDate = (date) => {
    return tasks.filter((task) => dayjs(task.dueDate).isSame(date, 'day'));
  };

  const handleTaskClick = (taskId) => {
    navigate('/tasks', { state: { taskId } });
  };

  const renderCalendar = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const daysInMonth = currentMonth.daysInMonth();
    const firstDayOfWeek = startOfMonth.day();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
    }

    // Add days of the current month
    for (let date = 1; date <= daysInMonth; date++) {
      const currentDate = dayjs(currentMonth).date(date);
      days.push(
        <div key={currentDate.format('YYYY-MM-DD')} className="calendar-day">
          <span>{date}</span>
          {getTasksForDate(currentDate).map((task) => (
            <div
              key={task._id}
              className={`task ${task.isCompleted ? 'completed-task' : ''}`}
              onClick={() => handleTaskClick(task._id)}
            >
              {task.text}
            </div>
          ))}
        </div>
      );
    }

    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - days.length; // 6 weeks * 7 days = 42 cells
    for (let i = 0; i < remainingCells; i++) {
      days.push(<div key={`empty-end-${i}`} className="calendar-day empty"></div>);
    }

    return days;
  };

  return (
    <div className="calendar-container">
      <h2>Calendar</h2>
      <div className="calendar-controls">
        <button onClick={() => handleMonthChange(-1)}>Previous</button>
        <span>{currentMonth.format('MMMM YYYY')}</span>
        <button onClick={() => handleMonthChange(1)}>Next</button>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="calendar-header">
            {day}
          </div>
        ))}
        {renderCalendar()}
      </div>
    </div>
  );
}

export default CalendarPage;
