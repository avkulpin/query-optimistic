'use client';

/**
 * TodoList Example
 *
 * Demonstrates:
 * - useQuery with a collection
 * - QueryState properties: isLoading, isSuccess, isFetching, isStale, dataUpdatedAt, status
 * - useMutation with optimistic updates
 * - channel.prepend(), channel.update(), channel.delete()
 * - Optimistic metadata (_optimistic status)
 * - Reconcile option for replacing temp IDs with server IDs
 */

import { useState } from 'react';
import { useQuery, useMutation } from 'query-optimistic';
import {
  todosCollection,
  createTodoMutation,
  updateTodoMutation,
  deleteTodoMutation,
} from '@/lib/definitions';

export function TodoList() {
  const [newTodoTitle, setNewTodoTitle] = useState('');

  // Fetch todos using useQuery
  // The second element contains many helpful properties from TanStack Query
  const [todos, query] = useQuery(todosCollection);

  // Destructure the properties we want to use
  const {
    isLoading,
    isSuccess,
    isError,
    isFetching,
    isStale,
    status,
    error,
    dataUpdatedAt,
    failureCount,
    refetch,
  } = query;

  // Create todo mutation with optimistic update
  const { mutate: createTodo, isPending: isCreating } = useMutation(createTodoMutation, {
    optimistic: (channel, params) => {
      channel(todosCollection).prepend(
        {
          id: `temp-${Date.now()}`,
          title: params.title,
          completed: false,
          createdAt: new Date().toISOString(),
        },
        { reconcile: true }
      );
    },
  });

  // Update todo mutation
  const { mutate: updateTodo } = useMutation(updateTodoMutation, {
    optimistic: (channel, params) => {
      channel(todosCollection).update(params.id, (todo) => ({
        ...todo,
        ...params,
      }));
    },
  });

  // Delete todo mutation
  const { mutate: deleteTodo } = useMutation(deleteTodoMutation, {
    optimistic: (channel, params) => {
      channel(todosCollection).delete(params.id);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    createTodo({ title: newTodoTitle.trim() });
    setNewTodoTitle('');
  };

  if (isLoading) {
    return <div className="loading">Loading todos...</div>;
  }

  if (isError) {
    return (
      <div className="error">
        <p>Error loading todos: {error?.message}</p>
        <p>Failed {failureCount} time(s)</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="todo-list">
      <h2>Todo List</h2>

      {/* Query State Info - demonstrates new properties */}
      <div className="query-state-info">
        <span className={`status-badge ${status}`}>Status: {status}</span>
        {isSuccess && <span className="status-badge success">isSuccess</span>}
        {isFetching && <span className="status-badge fetching">Fetching...</span>}
        {isStale && <span className="status-badge stale">Stale</span>}
        {dataUpdatedAt > 0 && (
          <span className="status-badge time">
            Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Add new todo form */}
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
          disabled={isCreating}
        />
        <button type="submit" disabled={isCreating || !newTodoTitle.trim()}>
          {isCreating ? 'Adding...' : 'Add Todo'}
        </button>
      </form>

      {/* Todo items */}
      <ul className="todos">
        {todos?.map((todo) => (
          <li
            key={todo.id}
            className={`todo-item ${todo.completed ? 'completed' : ''}`}
            style={{ opacity: todo._optimistic?.status === 'pending' ? 0.6 : 1 }}
          >
            <label>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => updateTodo({ id: todo.id, completed: !todo.completed })}
                disabled={todo._optimistic?.status === 'pending'}
              />
              <span className="todo-title">{todo.title}</span>
            </label>

            {todo._optimistic?.status === 'pending' && (
              <span className="status pending">Saving...</span>
            )}
            {todo._optimistic?.status === 'error' && (
              <span className="status error">Failed: {todo._optimistic.error}</span>
            )}

            <button
              className="delete-btn"
              onClick={() => deleteTodo({ id: todo.id })}
              disabled={todo._optimistic?.status === 'pending'}
            >
              &times;
            </button>
          </li>
        ))}
      </ul>

      {todos?.length === 0 && <p className="empty-state">No todos yet. Add one above!</p>}
    </div>
  );
}
