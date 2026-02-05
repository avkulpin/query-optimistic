'use client';

/**
 * Advanced Patterns Example
 *
 * Demonstrates:
 * - All QueryState properties: isLoading, isSuccess, isError, isPending, isFetching,
 *   isStale, isPlaceholderData, status, error, dataUpdatedAt, errorUpdatedAt, failureCount
 * - Query options (staleTime, cacheTime, refetchInterval, enabled)
 * - Manual channel usage outside mutations
 * - Conditional queries with enabled option
 */

import { useState } from 'react';
import { useQuery, useMutation, channel } from 'query-optimistic';
import { defineCollection, defineMutation } from 'query-optimistic/core';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const notificationsCollection = defineCollection<Notification, { userId: string }>({
  name: 'notifications',
  id: (n) => n.id,
  fetch: async (params) => {
    await new Promise((r) => setTimeout(r, 500));
    return [
      { id: '1', message: `Welcome, ${params.userId}!`, read: false, createdAt: new Date().toISOString() },
      { id: '2', message: 'You have a new follower', read: false, createdAt: new Date().toISOString() },
      { id: '3', message: 'Your post got 100 likes', read: true, createdAt: new Date().toISOString() },
    ];
  },
});

const markReadMutation = defineMutation<{ id: string }, void>({
  name: 'mark-read',
  mutate: async () => {
    await new Promise((r) => setTimeout(r, 200));
  },
});

const markAllReadMutation = defineMutation<{ userId: string }, void>({
  name: 'mark-all-read',
  mutate: async () => {
    await new Promise((r) => setTimeout(r, 300));
  },
});

export function AdvancedPatterns() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Query with all available state properties
  const [notifications, queryState] = useQuery(notificationsCollection, {
    params: { userId: userId ?? '' },
    enabled: isLoggedIn && !!userId,
    staleTime: 30000,
    cacheTime: 300000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  // Destructure ALL available properties
  const {
    isLoading,
    isFetching,
    isSuccess,
    isError,
    isPending,
    status,
    error,
    dataUpdatedAt,
    errorUpdatedAt,
    failureCount,
    isStale,
    isPlaceholderData,
    refetch,
  } = queryState;

  const { mutate: markRead } = useMutation(markReadMutation, {
    optimistic: (ch, params) => {
      ch(notificationsCollection, { userId: userId ?? '' }).update(params.id, (n) => ({
        ...n,
        read: true,
      }));
    },
    onMutate: (params) => console.log('Marking read:', params.id),
    onSuccess: (_, params) => console.log('Marked read:', params.id),
    onError: (err, params) => console.error('Failed:', params.id, err),
  });

  const { mutate: markAllRead } = useMutation(markAllReadMutation, {
    optimistic: (ch) => {
      ch(notificationsCollection, { userId: userId ?? '' }).updateWhere(
        (n) => !n.read,
        (n) => ({ ...n, read: true })
      );
    },
  });

  const simulateWebSocket = () => {
    if (userId) {
      const ch = channel(notificationsCollection, { userId });
      ch.prepend({
        id: `ws-${Date.now()}`,
        message: 'New notification from WebSocket!',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleLogin = () => {
    setUserId('user-123');
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return (
      <div className="advanced-patterns">
        <h2>Advanced Patterns</h2>
        <p>Login to see notifications (demonstrates conditional queries with enabled option)</p>
        <button onClick={handleLogin}>Login as User 123</button>
      </div>
    );
  }

  return (
    <div className="advanced-patterns">
      <h2>Advanced Patterns</h2>

      <div className="user-info">
        <span>Logged in as: {userId}</span>
        <button onClick={() => { setIsLoggedIn(false); setUserId(null); }}>Logout</button>
      </div>

      {/* Display ALL QueryState properties */}
      <div className="info-box">
        <h4>QueryState Properties (Live)</h4>
        <ul>
          <li><strong>status:</strong> {status}</li>
          <li><strong>isLoading:</strong> {String(isLoading)}</li>
          <li><strong>isPending:</strong> {String(isPending)}</li>
          <li><strong>isFetching:</strong> {String(isFetching)}</li>
          <li><strong>isSuccess:</strong> {String(isSuccess)}</li>
          <li><strong>isError:</strong> {String(isError)}</li>
          <li><strong>isStale:</strong> {String(isStale)}</li>
          <li><strong>isPlaceholderData:</strong> {String(isPlaceholderData)}</li>
          <li><strong>failureCount:</strong> {failureCount}</li>
          <li><strong>dataUpdatedAt:</strong> {dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString() : 'N/A'}</li>
          <li><strong>errorUpdatedAt:</strong> {errorUpdatedAt > 0 ? new Date(errorUpdatedAt).toLocaleTimeString() : 'N/A'}</li>
          <li><strong>error:</strong> {error?.message ?? 'null'}</li>
        </ul>
      </div>

      <div className="actions">
        <button onClick={() => refetch()}>Refresh</button>
        <button onClick={() => markAllRead({ userId: userId ?? '' })} disabled={!notifications?.some((n) => !n.read)}>
          Mark All Read
        </button>
        <button onClick={simulateWebSocket}>Simulate WebSocket</button>
      </div>

      {isLoading ? (
        <div className="loading">Loading notifications...</div>
      ) : (
        <div className="notifications">
          <h3>Notifications ({notifications?.filter((n) => !n.read).length ?? 0} unread)</h3>
          <ul>
            {notifications?.map((notification) => (
              <li
                key={notification.id}
                className={`notification ${notification.read ? 'read' : 'unread'}`}
                style={{ opacity: notification._optimistic?.status === 'pending' ? 0.6 : 1 }}
              >
                <span className="message">{notification.message}</span>
                {!notification.read && (
                  <button onClick={() => markRead({ id: notification.id })}>Mark Read</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
