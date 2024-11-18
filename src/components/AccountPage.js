import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AccountPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Fetch user details from server
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get('http://localhost:5000/user-details', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setUsername(response.data.username);
        setEmail(response.data.email);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    try {
      const response = await axios.put(
        'http://localhost:5000/update-password',
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        setSuccessMessage('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false); // Hide the form after successful change
      }
    } catch (error) {
      setErrorMessage(error.response?.data || 'Error updating password');
    }
  };

  const handleDeleteAccount = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    const confirmation = window.confirm(
      'Are you sure you want to delete your account? This action cannot be reversed.'
    );

    if (!confirmation) {
      setShowDeleteConfirm(false);
      return;
    }

    try {
      const response = await axios.delete('http://localhost:5000/delete-account', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        data: { password: deletePassword },
      });

      if (response.data.success) {
        alert('Account deleted successfully');
        localStorage.clear();
        window.location.href = '/login';
      }
    } catch (error) {
      setErrorMessage(error.response?.data || 'Incorrect password or error deleting account');
    }
  };

  return (
    <div>
      <h2>Account Settings</h2>

      {username && <h3>Welcome, {username}!</h3>}
      {email && <p>Email: {email}</p>}

      {/* Toggle visibility for the password change form */}
      <button onClick={() => setShowChangePassword(!showChangePassword)}>
        {showChangePassword ? 'Cancel' : 'Change Password'}
      </button>

      {showChangePassword && (
        <form onSubmit={handlePasswordChange}>
          <div>
            <label>Old Password:</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label>New Password:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Confirm New Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">Confirm Change</button>
        </form>
      )}

      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

      {/* Delete Account Section */}
      <button onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>

      {showDeleteConfirm && (
        <div>
          <h3>Are you sure you want to delete your account?</h3>
          <p>This action is irreversible.</p>
          <input
            type="password"
            placeholder="Enter password to confirm"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          <button onClick={handleDeleteAccount}>Confirm Delete</button>
          <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default AccountPage;
