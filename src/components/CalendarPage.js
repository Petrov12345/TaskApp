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
    axios.get('http://localhost:5000/tasks', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => setTasks(response.data))
      .catch(error => console.error('Error fetching tasks:', error));
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
    return tasks.filter(task => dayjs(task.dueDate).isSame(date, 'day'));
  };

  const handleTaskClick = (taskId) => {
    navigate('/tasks', { state: { taskId } }); // Pass taskId via state
  };

  const renderCalendar = () => {
    const startDay = currentMonth.startOf('month').startOf('week');
    const endDay = currentMonth.endOf('month').endOf('week');
    const calendar = [];
    let date = startDay;

    while (date.isBefore(endDay, 'day')) {
      calendar.push(
        <div key={date.format('YYYY-MM-DD')} className="calendar-row">
          {[...Array(7)].map((_, i) => {
            const dayTasks = getTasksForDate(date);
            const currentDate = date;
            date = date.add(1, 'day');
            return (
              <div 
                key={i} 
                className={`calendar-day ${currentDate.isSame(currentMonth, 'month') ? '' : 'disabled'}`}>
                <span>{currentDate.date()}</span>
                {dayTasks.map(task => (
                  <div 
                    key={task._id} 
                    className="task" 
                    onClick={() => handleTaskClick(task._id)} // Pass task ID on click
                  >
                    {task.text}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    }

    return calendar;
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
        {renderCalendar()}
      </div>
    </div>
  );
}

export default CalendarPage;
