import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../App';
import '../CSS-Style/ManageTeamPage.css';

function ManageTeamPage() {
  const [ownedTeams, setOwnedTeams] = useState([]);
  const [joinedTeams, setJoinedTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [friends, setFriends] = useState([]);
  const [tasks, setTasks] = useState([]);
  const token = localStorage.getItem('token');
  const loggedInUserId = localStorage.getItem('userId');
  const socket = useContext(SocketContext);

  const fetchTeams = useCallback(() => {
    axios
      .get('http://3.145.63.83:5000/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        const userId = response.data.userId;
        const owned = response.data.teams.filter((team) => team.owner._id === userId);
        const joined = response.data.teams.filter((team) => team.owner._id !== userId);
        setOwnedTeams(owned);
        setJoinedTeams(joined);
      })
      .catch((error) => console.error('Error fetching teams:', error));
  }, [token]);

  const fetchFriends = useCallback(() => {
    axios
      .get('http://3.145.63.83:5000/friends', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setFriends(response.data.friends))
      .catch((error) => console.error('Error fetching friends:', error));
  }, [token]);

  const fetchTasks = useCallback(() => {
    axios
      .get('http://3.145.63.83:5000/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setTasks(response.data))
      .catch((error) => console.error('Error fetching tasks:', error));
  }, [token]);

  useEffect(() => {
    fetchTeams();
    fetchFriends();
    fetchTasks();

    if (socket) {
      socket.on('teamUpdated', fetchTeams);
      socket.on('taskUpdated', fetchTasks);
      socket.on('inviteSent', fetchTeams);
      socket.on('inviteAccepted', fetchTeams);
      socket.on('teamDeleted', fetchTeams);
      socket.on('leaveTeam', fetchTasks);
    }

    return () => {
      socket?.off('teamUpdated', fetchTeams);
      socket?.off('taskUpdated', fetchTasks);
      socket?.off('inviteSent', fetchTeams);
      socket?.off('inviteAccepted', fetchTeams);
      socket?.off('teamDeleted', fetchTeams);
      socket?.off('leaveTeam', fetchTasks);
    };
  }, [fetchTeams, fetchFriends, fetchTasks, socket]);

  const handleSelectTeam = (team) => {
    setSelectedTeam(team);
    setNewTeamName(team.name);
    setTeamMembers(team.members);
    setPendingInvites(team.pendingInvites || []);
  };

  const handleRenameTeam = () => {
    if (!newTeamName.trim()) {
      alert('Please enter a valid team name.');
      return;
    }

    axios
      .post(
        'http://3.145.63.83:5000/manage-team',
        {
          teamId: selectedTeam._id,
          action: 'rename',
          name: newTeamName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        alert('Team name updated.');
        setOwnedTeams(
          ownedTeams.map((team) =>
            team._id === selectedTeam._id ? { ...team, name: newTeamName } : team
          )
        );
      })
      .catch((error) => {
        if (
          error.response?.status === 400 &&
          error.response.data === 'You already have a team with this name'
        ) {
          alert('Team name already in use.');
        } else {
          console.error('Error renaming team:', error);
          alert('Error renaming team. Please try again.');
        }
      });
  };

  const handleAddMember = (friendId) => {
    axios
      .post(
        'http://3.145.63.83:5000/invite-to-team',
        {
          teamId: selectedTeam._id,
          inviteeId: friendId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        alert('Invite sent successfully.');
        const invitedFriend = friends.find((f) => f._id === friendId);
        setPendingInvites([
          ...pendingInvites,
          { _id: friendId, username: invitedFriend.username },
        ]);
      })
      .catch((error) => {
        if (
          error.response?.status === 400 &&
          error.response.data === 'User already invited to this team'
        ) {
          alert('Invite already sent.');
        } else {
          console.error('Error sending invite:', error);
          alert('Error sending invite. Please try again.');
        }
      });
  };

  const handleRevokeInvite = (inviteeId) => {
    axios
      .post(
        'http://3.145.63.83:5000/manage-team',
        {
          teamId: selectedTeam._id,
          action: 'remove',
          memberId: inviteeId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        setPendingInvites(pendingInvites.filter((invite) => invite._id !== inviteeId));
      })
      .catch((error) => console.error('Error revoking invite:', error));
  };

  const handleRemoveMember = (memberId) => {
    axios
      .post(
        'http://3.145.63.83:5000/manage-team',
        {
          teamId: selectedTeam._id,
          action: 'remove',
          memberId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        setTeamMembers(teamMembers.filter((member) => member._id !== memberId));
        fetchTasks();
      })
      .catch((error) => console.error('Error removing member:', error));
  };

  const handleLeaveTeam = () => {
    if (window.confirm('Are you sure you want to leave this team?')) {
      axios
        .post(
          'http://3.145.63.83:5000/leave-team',
          {
            teamId: selectedTeam._id,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then(() => {
          setJoinedTeams(joinedTeams.filter((team) => team._id !== selectedTeam._id));
          setSelectedTeam(null);
          fetchTasks();
        })
        .catch((error) => console.error('Error leaving team:', error));
    }
  };

  const handleDeleteTeam = () => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      axios
        .delete(`http://3.145.63.83:5000/delete-team/${selectedTeam._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => {
          setOwnedTeams(ownedTeams.filter((team) => team._id !== selectedTeam._id));
          setSelectedTeam(null);
          fetchTasks();
        })
        .catch((error) => console.error('Error deleting team:', error));
    }
  };

  return (
    <div className="manage-team-container">
      <h2>Manage Team</h2>

      <h3>Select a Team</h3>
      <h4>Your Teams</h4>
      <ul>
        {ownedTeams.map((team) => (
          <li key={team._id}>
            {team.name}
            <button onClick={() => handleSelectTeam(team)}>Manage</button>
          </li>
        ))}
      </ul>

      <h4>Teams</h4>
      <ul>
        {joinedTeams.map((team) => (
          <li key={team._id}>
            {team.name}
            <button onClick={() => handleSelectTeam(team)}>View</button>
          </li>
        ))}
      </ul>

      {selectedTeam && (
        <div>
          <h3>Managing Team: {selectedTeam.name}</h3>

          <h4>Team Members</h4>
          <ul>
            {teamMembers.map((member) => (
              <li key={member._id}>
                {member.username}
                {selectedTeam.owner._id === loggedInUserId && member._id !== loggedInUserId && (
                  <button onClick={() => handleRemoveMember(member._id)}>Remove</button>
                )}
              </li>
            ))}
          </ul>

          {selectedTeam.owner._id === loggedInUserId ? (
            <>
              <div>
                <label>Rename Team:</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
                <button onClick={handleRenameTeam}>Save</button>
              </div>

              <h4>Pending Invites</h4>
              <ul>
                {pendingInvites.map((invite) => (
                  <li key={invite._id}>
                    {invite.username ? invite.username : '(Pending)'} (Pending)
                    <button onClick={() => handleRevokeInvite(invite._id)}>Revoke Invite</button>
                  </li>
                ))}
              </ul>

              <h4>Add Members</h4>
              <ul>
                {friends
                  .filter(
                    (friend) =>
                      !teamMembers.some((member) => member._id === friend._id) &&
                      !pendingInvites.some((invite) => invite._id === friend._id)
                  )
                  .map((friend) => (
                    <li key={friend._id}>
                      {friend.username}
                      <button onClick={() => handleAddMember(friend._id)}>Invite</button>
                    </li>
                  ))}
              </ul>
              <button onClick={handleDeleteTeam}>Delete Team</button>
            </>
          ) : (
            <button onClick={handleLeaveTeam}>Leave Team</button>
          )}
        </div>
      )}
    </div>
  );
}

export default ManageTeamPage;
