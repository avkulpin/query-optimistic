'use client';

/**
 * UserProfile Example
 *
 * Demonstrates:
 * - useQuery with an entity
 * - QueryState: isSuccess, isPending, status
 * - Entity params for dynamic fetching
 * - channel.update() for entities
 * - Debounced auto-save pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'query-optimistic';
import { userEntity, updateUserMutation } from '@/lib/definitions';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function UserProfile() {
  const [user, { isLoading, isSuccess, isPending, status, error }] = useQuery(userEntity, {
    params: { id: 'user-1' },
  });

  const [formData, setFormData] = useState({ name: '', email: '', bio: '' });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (user && !isDirty) {
      setFormData({ name: user.name, email: user.email, bio: user.bio });
    }
  }, [user, isDirty]);

  const debouncedFormData = useDebounce(formData, 1000);

  const { mutate: updateUser, isPending: isSaving } = useMutation(updateUserMutation, {
    optimistic: (channel, params) => {
      channel(userEntity, { id: params.id }).update((currentUser) => ({
        ...currentUser,
        ...params,
      }));
    },
    onSuccess: () => setIsDirty(false),
  });

  useEffect(() => {
    if (isDirty && user) {
      updateUser({
        id: user.id,
        name: debouncedFormData.name,
        email: debouncedFormData.email,
        bio: debouncedFormData.bio,
      });
    }
  }, [debouncedFormData, isDirty, user, updateUser]);

  const handleChange = useCallback(
    (field: keyof typeof formData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        setIsDirty(true);
      },
    []
  );

  if (isLoading || isPending) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!isSuccess || !user) {
    return <div className="error">Error loading profile: {error?.message}</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>

      <div className="query-state-info">
        <span className={`status-badge ${status}`}>Status: {status}</span>
        {isSuccess && <span className="status-badge success">isSuccess</span>}
      </div>

      <div className="save-status">
        {user._optimistic?.status === 'pending' && <span className="saving">Saving changes...</span>}
        {isSaving && !user._optimistic && <span className="saving">Saving...</span>}
        {!isSaving && isDirty && <span className="unsaved">Unsaved changes (auto-saving...)</span>}
        {!isSaving && !isDirty && <span className="saved">All changes saved</span>}
      </div>

      <div className="avatar-section">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt={user.name} className="avatar" />
      </div>

      <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input id="name" type="text" value={formData.name} onChange={handleChange('name')} />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={formData.email} onChange={handleChange('email')} />
        </div>
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" value={formData.bio} onChange={handleChange('bio')} rows={4} />
        </div>
      </form>

      {user._optimistic?.status === 'error' && (
        <div className="error-banner">Failed to save: {user._optimistic.error}</div>
      )}
    </div>
  );
}
