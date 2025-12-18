# query-optimistic

Simple, type-safe data fetching and optimistic updates for React.

A lightweight wrapper around TanStack Query that provides a cleaner API for defining queries, mutations, and handling optimistic updates with full TypeScript inference.

## Features

- **Type-safe definitions** - Define queries and mutations once, get full type inference everywhere
- **Simplified optimistic updates** - Imperative channel API for intuitive UI updates
- **Automatic rollback** - Failed mutations automatically revert optimistic changes
- **Multiple query sync** - Update multiple queries/entities in a single mutation
- **Framework agnostic core** - Core utilities work without React

## Installation

```bash
npm install query-optimistic @tanstack/react-query
```

## Quick Start

```typescript
import { defineCollection, defineMutation, useQuery, useMutation } from 'query-toolkit'

// Define a collection
const usersCollection = defineCollection({
  name: 'users',
  id: (user) => user.id,
  fetch: () => api.get('/users')
})

// Define a mutation
const createUser = defineMutation({
  mutate: (params: { name: string }) => api.post('/users', params)
})

// Use in components
function UserList() {
  const [users, { isLoading }] = useQuery(usersCollection)

  const { mutate } = useMutation(createUser, {
    optimistic: (channel, params) => {
      channel(usersCollection).prepend({
        id: 'temp-' + Date.now(),
        name: params.name,
      }, { sync: true })
    }
  })

  return (
    <div>
      <button onClick={() => mutate({ name: 'New User' })}>Add User</button>
      {users?.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  )
}
```

## Defining Data Sources

### Collections (Arrays)

```typescript
interface User {
  id: string
  name: string
  email: string
}

const usersCollection = defineCollection<User, { page?: number }>({
  name: 'users',
  id: (user) => user.id,  // Required: how to identify items
  fetch: ({ page = 1 }) => api.get(`/users?page=${page}`)
})
```

### Entities (Single Items)

```typescript
interface Profile {
  id: string
  name: string
  avatar: string
}

const profileEntity = defineEntity<Profile, string>({
  name: 'profile',
  fetch: (userId) => api.get(`/users/${userId}/profile`)
})
```

### Mutations

```typescript
interface CreateUserParams {
  name: string
  email: string
}

const createUser = defineMutation<CreateUserParams, User>({
  name: 'createUser',  // Optional: used as mutation key
  mutate: (params) => api.post('/users', params)
})
```

## Using Queries

### Basic Query

```typescript
function UserList() {
  const [users, { isLoading, error, refetch }] = useQuery(usersCollection)

  if (isLoading) return <Loading />
  if (error) return <Error error={error} />

  return <ul>{users?.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}
```

### With Parameters

```typescript
const [users] = useQuery(usersCollection, {
  params: { page: 2 }
})
```

### Entity Query

```typescript
const [profile] = useQuery(profileEntity, {
  params: userId
})
```

### Paginated (Infinite) Query

```typescript
const [posts, query, pagination] = useQuery(postsCollection, {
  paginated: true,
  getPageParams: ({ pageParam = 1 }) => ({ page: pageParam, limit: 10 })
})

// Load more
<button onClick={pagination.fetchNextPage} disabled={!pagination.hasNextPage}>
  Load More
</button>
```

## Optimistic Updates with Channel API

The channel API provides an imperative way to apply optimistic updates:

```typescript
const { mutate } = useMutation(createUser, {
  optimistic: (channel, params) => {
    // Add to collection immediately
    channel(usersCollection).prepend({
      id: 'temp-' + Date.now(),
      name: params.name,
      email: params.email,
    }, { sync: true })  // sync: replace with server response
  }
})
```

### Collection Operations

```typescript
optimistic: (channel, params) => {
  const ch = channel(usersCollection)

  // Add items
  ch.prepend(newItem, { sync: true })
  ch.append(newItem, { sync: true })

  // Update by ID
  ch.update(params.id, user => ({
    ...user,
    name: params.newName
  }))

  // Delete by ID
  ch.delete(params.id)
}
```

### Entity Operations

```typescript
optimistic: (channel, params) => {
  channel(profileEntity).update(profile => ({
    ...profile,
    name: params.newName
  }))

  // Or replace entirely
  channel(profileEntity).replace(newProfile)
}
```

### Multiple Updates

Update multiple collections/entities in a single mutation:

```typescript
const { mutate } = useMutation(deleteUser, {
  optimistic: (channel, params) => {
    // Remove from users list
    channel(usersCollection).delete(params.userId)

    // Update stats
    channel(statsEntity).update(stats => ({
      ...stats,
      userCount: stats.userCount - 1
    }))
  }
})
```

## Standalone Channel (Outside Mutations)

Use the channel directly for immediate updates with manual rollback:

```typescript
import { channel } from 'query-toolkit'

async function handleLike(postId: string) {
  // Apply optimistic update immediately
  const rollback = channel(postsCollection).update(postId, post => ({
    ...post,
    likes: post.likes + 1
  }))

  try {
    await api.post(`/posts/${postId}/like`)
  } catch (error) {
    // Undo on failure
    rollback()
  }
}
```

## Optimistic Status

Items with pending optimistic updates include metadata for UI feedback:

```typescript
{users?.map(user => (
  <div
    key={user.id}
    style={{ opacity: user._optimistic?.status === 'pending' ? 0.5 : 1 }}
  >
    {user.name}
    {user._optimistic?.status === 'error' && (
      <span className="error">Failed to save</span>
    )}
  </div>
))}
```

## API Reference

### `defineCollection<TData, TParams>(config)`

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier |
| `id` | `(item: TData) => string` | Extract ID from item |
| `fetch` | `(params: TParams) => Promise<TData[]>` | Fetch function |

### `defineEntity<TData, TParams>(config)`

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Unique identifier |
| `fetch` | `(params: TParams) => Promise<TData>` | Fetch function |

### `defineMutation<TParams, TResponse>(config)`

| Property | Type | Description |
|----------|------|-------------|
| `name?` | `string` | Optional mutation key |
| `mutate` | `(params: TParams) => Promise<TResponse>` | Mutation function |

### `useQuery(def, options?)`

Returns `[data, queryState]` or `[data, queryState, paginationState]` for paginated queries.

**Options:**
- `params` - Parameters for fetch function
- `enabled` - Enable/disable query
- `staleTime` - Time before data is stale (ms)
- `refetchOnMount` - Refetch on component mount
- `refetchOnWindowFocus` - Refetch when window focuses
- `refetchInterval` - Polling interval (ms)
- `paginated` - Enable infinite query mode
- `getPageParams` - Transform page context to params

### `useMutation(def, options?)`

Returns `{ mutate, mutateAsync, isPending, isError, isSuccess, error, data, reset }`.

**Options:**
- `optimistic` - `(channel, params) => void` - Apply optimistic updates
- `onMutate` - Called when mutation starts
- `onSuccess` - Called on success
- `onError` - Called on error

### `channel(target)`

Standalone channel for immediate optimistic updates.

```typescript
// For collections
channel(collection).prepend(item, { sync?: boolean })
channel(collection).append(item, { sync?: boolean })
channel(collection).update(id, updateFn, { sync?: boolean })
channel(collection).updateWhere(predicate, updateFn)
channel(collection).delete(id)
channel(collection).deleteWhere(predicate)

// For entities
channel(entity).update(updateFn, { sync?: boolean })
channel(entity).replace(data, { sync?: boolean })
```

All methods return a rollback function.

## Submodule Imports

```typescript
// Core only (no React dependency)
import { defineCollection, defineEntity, defineMutation, channel } from 'query-toolkit/core'

// React hooks only
import { useQuery, useMutation } from 'query-toolkit/react'
```

## TypeScript

Full type inference from definitions:

```typescript
const usersCollection = defineCollection<User, { page: number }>({...})
const createUser = defineMutation<CreateUserParams, User>({...})

// Types flow automatically
const [users] = useQuery(usersCollection, { params: { page: 1 } })
// users: User[] | undefined

const { mutate } = useMutation(createUser, {
  optimistic: (channel, params) => {
    // params: CreateUserParams
    channel(usersCollection).prepend({...})
    // Type-checks that data matches User
  }
})
// mutate: (params: CreateUserParams) => void
```

## Peer Dependencies

- `react` >= 18.0.0
- `@tanstack/react-query` >= 5.0.0

## License

MIT
