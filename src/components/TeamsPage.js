import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../App';
import '../CSS-Style/TeamsPage.css';

function TeamsPage() {
  const [ownedTeams, setOwnedTeams] = useState([]);
  const [joinedTeams, setJoinedTeams] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const socket = useContext(SocketContext);

  // Fetches teams the user is a member of and owns
  const fetchTeamsData = useCallback(() => {
    axios
      .get('http://localhost:5000/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const owned = response.data.teams.filter((team) => team.owner._id === userId);
        const joined = response.data.teams.filter((team) => team.owner._id !== userId);
        setOwnedTeams(owned);
        setJoinedTeams(joined);
      })
      .catch((error) => console.error('Error fetching teams:', error));
  }, [token, userId]);

  // Fetches the list of team invites
  const fetchInvitesData = useCallback(() => {
    axios
      .get('http://localhost:5000/team-invites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setTeamInvites(response.data))
      .catch((error) => console.error('Error fetching team invites:', error));
  }, [token]);

  // Initial fetch and set up real-time updates
  useEffect(() => {
    fetchTeamsData();
    fetchInvitesData();

    if (socket) {
      // Real-time updates on team actions
      socket.on('teamUpdated', fetchTeamsData);
      socket.on('inviteSent', fetchInvitesData);
      socket.on('inviteAccepted', fetchTeamsData);
      socket.on('inviteRevoked', fetchInvitesData);
      socket.on('teamDeleted', fetchTeamsData);
      socket.on('leaveTeam', fetchTeamsData);
    }

    // Clean up listeners on component unmount
    return () => {
      socket?.off('teamUpdated', fetchTeamsData);
      socket?.off('inviteSent', fetchInvitesData);
      socket?.off('inviteAccepted', fetchTeamsData);
      socket?.off('inviteRevoked', fetchInvitesData);
      socket?.off('teamDeleted', fetchTeamsData);
      socket?.off('leaveTeam', fetchTeamsData);
    };
  }, [socket, fetchTeamsData, fetchInvitesData]);

  // Handles accepting an invite
  const handleAcceptInvite = (teamId) => {
    axios
      .post(
        'http://localhost:5000/respond-team-invite',
        {
          teamId,
          action: 'accept',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        setTeamInvites(teamInvites.filter((invite) => invite.team._id !== teamId));
        fetchTeamsData(); // Refreshes teams list after acceptance
      })
      .catch((error) => console.error('Error accepting invite:', error));
  };

  // Handles denying an invite
  const handleDenyInvite = (teamId) => {
    axios
      .post(
        'http://localhost:5000/respond-team-invite',
        {
          teamId,
          action: 'deny',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        setTeamInvites(teamInvites.filter((invite) => invite.team._id !== teamId));
      })
      .catch((error) => console.error('Error denying invite:', error));
  };

  return (
    <div className="teams-container">
      <h2>Teams</h2>
      <div>
        <Link to="/create-team">
          <button>Create Team</button>
        </Link>
        <Link to="/manage-team">
          <button>Manage Team</button>
        </Link>
      </div>

      <h3>Your Teams</h3>
      {ownedTeams.length > 0 ? (
        <ul>
          {ownedTeams.map((team) => (
            <li key={team._id}>{team.name}</li>
          ))}
        </ul>
      ) : (
        <p>You don't own any teams.</p>
      )}

      <h3>Teams</h3>
      {joinedTeams.length > 0 ? (
        <ul>
          {joinedTeams.map((team) => (
            <li key={team._id}>{team.name}</li>
          ))}
        </ul>
      ) : (
        <p>You're not a member of any teams.</p>
      )}

      <h3>Team Invites</h3>
      {teamInvites.length > 0 ? (
        <ul className="team-invites-list">
          {teamInvites.map((invite) => (
            <li key={invite.team._id}>
              {invite.team.name} (invited by {invite.invitedBy.username})
              <button onClick={() => handleAcceptInvite(invite.team._id)}>Accept</button>
              <button onClick={() => handleDenyInvite(invite.team._id)}>Deny</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have no team invites.</p>
      )}
    </div>
  );
}

export default TeamsPage;