import React, { useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';

function CreateTeamPage() {
  const [teamName, setTeamName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();

  // Fetch friends using React Query
  const { data: friends, error, isLoading } = useQuery('friends', async () => {
    const response = await axios.get('http://localhost:5000/friends', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.friends;
  });

  // Mutation to create a new team
  const createTeamMutation = useMutation(
    async ({ name, selectedMembers }) => {
      // First, create the team
      const teamResponse = await axios.post(
        'http://localhost:5000/create-team',
        { name },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const teamId = teamResponse.data.team._id;

      // Send invites to selected members
      const invitePromises = selectedMembers.map((memberId) =>
        axios.post(
          'http://localhost:5000/invite-to-team',
          { teamId, inviteeId: memberId },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
      );
      await Promise.all(invitePromises); // Await all invite requests to complete

      return teamId;
    },
    {
      onSuccess: () => {
        alert('Team created successfully!');
        queryClient.invalidateQueries('friends'); // Refresh friends if needed
        setTeamName('');
        setSelectedMembers([]);
        window.location.href = '/teams'; // Redirect after success
      },
      onError: (error) => {
        if (error.response?.status === 400 && error.response?.data === "You already have a team with this name") {
          alert("Team name already in use");
        } else {
          console.error("Error creating team:", error);
          alert("Error creating team. Please try again.");
        }
      },
    }
  );

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      alert("Must enter a valid team name");
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

  // Display loading or error message while data is fetched
  if (isLoading) return <p>Loading friends...</p>;
  if (error) return <p>Error loading friends: {error.message}</p>;

  return (
    <div>
      <h2>Create Team</h2>
      <div>
        <label>Team Name: </label>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter team name"
        />
      </div>

      <h3>Invite Members</h3>
      <ul>
        {friends.map((friend) => (
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
