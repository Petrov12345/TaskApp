import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { io } from 'socket.io-client';

// Establish a socket connection
const socket = io('http://localhost:5000');

function FriendsPage() {
  const [friendUsername, setFriendUsername] = useState('');
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();

  // Query keys for better reuse and consistency
  const FRIENDS_DATA_QUERY_KEY = 'friendsData';

  // Fetch friends and friend requests
  const { data, error, isLoading } = useQuery(FRIENDS_DATA_QUERY_KEY, async () => {
    const response = await axios.get('http://localhost:5000/friends', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  });

  const friends = data?.friends || [];
  const friendRequests = data?.friendRequests || [];

  // Mutation for sending a friend request
  const sendFriendRequestMutation = useMutation(
    async (username) => {
      const response = await axios.post(
        'http://localhost:5000/send-friend-request',
        { friendUsername: username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        alert('Friend request sent!');
        setFriendUsername('');
      },
      onError: (error) => {
        alert(error.response?.data?.error || 'An unexpected error occurred.');
      },
    }
  );

  // Mutation for responding to friend requests
  const respondToFriendRequestMutation = useMutation(
    async ({ requesterId, action }) => {
      await axios.post(
        'http://localhost:5000/respond-friend-request',
        { requesterId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(FRIENDS_DATA_QUERY_KEY); // Refresh friends and requests
      },
      onError: (error) => {
        console.error('Error responding to friend request:', error);
      },
    }
  );

  // Mutation for removing a friend
  const removeFriendMutation = useMutation(
    async (friendId) => {
      await axios.post(
        'http://localhost:5000/remove-friend',
        { friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(FRIENDS_DATA_QUERY_KEY); // Refresh friends
      },
      onError: (error) => {
        console.error('Error removing friend:', error);
      },
    }
  );

  // Real-time updates for friends and friend requests
  useEffect(() => {
    if (socket) {
      socket.on('dataUpdated', () => {
        queryClient.invalidateQueries(FRIENDS_DATA_QUERY_KEY);
      });
    }

    return () => {
      socket?.off('dataUpdated');
    };
  }, [queryClient]);

  const handleSendFriendRequest = () => {
    sendFriendRequestMutation.mutate(friendUsername);
  };

  const handleRespondToFriendRequest = (requesterId, action) => {
    respondToFriendRequestMutation.mutate({ requesterId, action });
  };

  const handleRemoveFriend = (friendId, friendName) => {
    if (window.confirm(`Are you sure you want to remove ${friendName} as a friend?`)) {
      removeFriendMutation.mutate(friendId);
    }
  };

  if (isLoading) return <p>Loading friends...</p>;
  if (error) return <p>Error loading friends: {error.message}</p>;

  return (
    <div>
      <h2>Friends</h2>

      <div>
        <input
          type="text"
          value={friendUsername}
          onChange={(e) => setFriendUsername(e.target.value)}
          placeholder="Enter username to add as friend"
        />
        <button onClick={handleSendFriendRequest} disabled={sendFriendRequestMutation.isLoading}>
          {sendFriendRequestMutation.isLoading ? 'Sending...' : 'Send Friend Request'}
        </button>
      </div>

      <h3>Your Friends</h3>
      <ul>
        {friends.map((friend) => (
          <li key={friend._id}>
            {friend.username}
            <button onClick={() => handleRemoveFriend(friend._id, friend.username)} style={{ marginLeft: '10px' }}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <h3>Friend Requests</h3>
      <ul>
        {friendRequests.map((request) => (
          <li key={request._id}>
            {request.username}
            <button onClick={() => handleRespondToFriendRequest(request._id, 'accept')}>Accept</button>
            <button onClick={() => handleRespondToFriendRequest(request._id, 'deny')}>Deny</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FriendsPage;