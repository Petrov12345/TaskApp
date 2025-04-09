import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../App';

function TeamInvitesPage() {
  const [invites, setInvites] = useState([]);
  const token = localStorage.getItem('token');
  const socket = useContext(SocketContext);

  const fetchInvites = () => {
    axios.get('http://3.145.63.83:5000/team-invites', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => setInvites(response.data))
      .catch(error => console.error("Error fetching team invites:", error));
  };

  useEffect(() => {
    // Fetch initial invites on component mount
    fetchInvites();

    if (socket) {
      // Listeners for real-time invite updates
      socket.on('inviteSent', fetchInvites);
      socket.on('inviteRevoked', fetchInvites);

      // Clean up listeners on component unmount
      return () => {
        socket.off('inviteSent', fetchInvites);
        socket.off('inviteRevoked', fetchInvites);
      };
    }
  }, [socket]);

  const handleInviteResponse = (teamId, action) => {
    axios.post('http://3.145.63.83:5000/respond-team-invite', { teamId, action }, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        setInvites(invites.filter(invite => invite.team._id !== teamId));
        alert(`Invite ${action}ed successfully`);
      })
      .catch(error => console.error(`Error ${action}ing invite:`, error));
  };

  return (
    <div>
      <h2>Team Invites</h2>
      {invites.length > 0 ? (
        <ul>
          {invites.map(invite => (
            <li key={invite.team._id}>
              Team: {invite.team.name} | Owner: {invite.team.owner.username}
              <button onClick={() => handleInviteResponse(invite.team._id, 'accept')}>Accept</button>
              <button onClick={() => handleInviteResponse(invite.team._id, 'deny')}>Deny</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending invites</p>
      )}
    </div>
  );
}

export default TeamInvitesPage;
