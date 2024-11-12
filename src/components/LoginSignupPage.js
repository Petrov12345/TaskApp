import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function LoginSignupPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });
  const navigate = useNavigate();

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', confirmPassword: '', username: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const response = await axios.post('http://localhost:5000/login', {
          email: formData.email,
          password: formData.password,
        });
        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userId', response.data.userId);
          localStorage.setItem('username', response.data.username);
          onLogin();
          alert("Login successful!");
          navigate('/');
        } else {
          alert("Invalid credentials. Please try again.");
        }
      } else {
        if (formData.password !== formData.confirmPassword) {
          alert("Passwords do not match.");
          return;
        }
        await axios.post('http://localhost:5000/signup', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        alert("Signup successful! You can now log in.");
        toggleForm();
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert(error.response.data.message || "There was an error. Please try again.");
      } else {
        alert("An unexpected error occurred. Please try again later.");
      }
    }
  };

  return (
    <div>
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div>
            <label>Username:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
        )}
        <div>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        {!isLogin && (
          <div>
            <label>Confirm Password:</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        )}
        <button type="submit" disabled={!formData.email || !formData.password}>
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <p onClick={toggleForm} style={{ cursor: 'pointer', color: 'blue' }}>
        {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
      </p>
    </div>
  );
}

export default LoginSignupPage;