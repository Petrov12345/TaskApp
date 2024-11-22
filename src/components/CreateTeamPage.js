import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import '../CSS-Style/CreateTeamPage.css';

function CreateTeamPage() {
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch friends using React Query
  const { data: friends, error, isLoading } = useQuery(
    'friends',
    async () => {
      if (!token) {
        navigate('/login'); // Redirect if no token
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/friends', {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.friends;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token'); // Clear invalid token
          navigate('/login'); // Redirect to login
        }
        throw error; // Pass error for error handling in UI
      }
    },
    { enabled: !!token } // Only run query if token is present
  );

  // Mutation to create a new team
  const createTeamMutation = useMutation(
    async ({ name, selectedMembers }) => {
      try {
        // First, create the team
        const teamResponse = await axios.post(
          'http://localhost:5000/create-team',
          { name, members: selectedMembers }, // Include members directly in team creation
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return teamResponse.data.team._id; // Return teamId if successful
      } catch (error) {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('token'); // Clear invalid token
          navigate('/login'); // Redirect to login
        }
        throw error; // Pass error to onError for handling
      }
    },
    {
      onSuccess: () => {
        alert('Team created successfully!'); // Success alert
        queryClient.invalidateQueries('teams'); // Refresh team queries if needed
        setTeamName(''); // Reset form
        setSelectedMembers([]);
        navigate('/teams'); // Redirect to teams page
      },
      onError: (error) => {
        if (
          error.response?.status === 400 &&
          error.response?.data === 'You already have a team with this name'
        ) {
          alert('Team name already in use');
        } else {
          console.error('Error creating team or sending invites:', error);
          alert('Error creating team. Please try again.');
        }
      },
    }
  );

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      alert('Please enter a valid team name.');
      return;
    }
    createTeamMutation.mutate({ name: teamName, selectedMembers });
  };

  const toggleMemberSelection = (friendId) => {
    setSelectedMembers((prevSelected) =>
      prevSelected.includes(friendId)
        ? prevSelected.filter((id) => id !== friendId)
        : [...prevSelected, friendId]
    );
  };

  if (isLoading) return <p>Loading friends...</p>;
  if (error) return <p>Error loading friends: {error.message}</p>;

  return (
    <div className="create-team-container">
      <h2>Create Team</h2>
      <div>
        <label>Team Name:</label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter team name"
        />
      </div>

      <h3>Invite Members</h3>
      <ul>
        {friends &&
          friends.map((friend) => (
            <li key={friend._id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(friend._id)}
                  onChange={() => toggleMemberSelection(friend._id)}
                />
                {friend.username}
              </label>
            </li>
          ))}
      </ul>

      <button onClick={handleCreateTeam} disabled={createTeamMutation.isLoading}>
        {createTeamMutation.isLoading ? 'Creating Team...' : 'Create Team and Send Invites'}
      </button>
    </div>
  );
}

export default CreateTeamPage;