<p align="center">
  <img src="https://raw.githubusercontent.com/avkulpin/query-optimistic/main/assets/logo.svg" alt="query-optimistic" width="400" />
</p>

<h1 align="center">query-optimistic</h1>

<p align="center">
  <strong>Simple, type-safe data fetching and optimistic updates for React</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/query-optimistic"><img src="https://img.shields.io/npm/v/query-optimistic.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/query-optimistic"><img src="https://img.shields.io/npm/dm/query-optimistic.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://bundlephobia.com/package/query-optimistic"><img src="https://img.shields.io/bundlephobia/minzip/query-optimistic?style=flat-square" alt="bundle size" /></a>
  <a href="https://github.com/avkulpin/query-optimistic/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/query-optimistic.svg?style=flat-square" alt="license" /></a>
  <a href="https://github.com/avkulpin/query-optimistic"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square" alt="TypeScript" /></a>
</p>

<p align="center">
  A lightweight wrapper around <a href="https://tanstack.com/query">TanStack Query</a> that provides a cleaner API for defining queries, mutations, and handling optimistic updates with full TypeScript inference.
</p>

---

## Why query-optimistic?

TanStack Query is powerful but optimistic updates can get complex fast. This library gives you:

| Feature | TanStack Query | query-optimistic |
|---------|---------------|------------------|
| Define data sources | Inline in each component | Once, reuse everywhere |
| Optimistic updates | Manual cache manipulation | Intuitive channel API |
| Type safety | Manual type annotations | Automatic inference |
| Multi-query updates | Complex cache logic | Simple method chaining |
| Rollback on error | Manual implementation | Automatic |

```tsx
// Before: TanStack Query optimistic update
useMutation({
  mutationFn: createTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] })
    const previous = queryClient.getQueryData(['todos'])
    queryClient.setQueryData(['todos'], (old) => [...old, newTodo])
    return { previous }
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  }
})

// After: query-optimistic
useMutation(createTodo, {
  optimistic: (channel, todo) => {
    channel(todosCollection).append(todo, { sync: true })
  }
})
```

---

## Installation

```bash
npm install query-optimistic @tanstack/react-query
```

```bash
yarn add query-optimistic @tanstack/react-query
```

```bash
pnpm add query-optimistic @tanstack/react-query
```

---

## Quick Start

### 1. Define your data sources

```typescript
import { defineCollection, defineEntity, defineMutation } from 'query-optimistic'

// A collection is an array of items
const todosCollection = defineCollection({
  name: 'todos',
  id: (todo) => todo.id,
  fetch: () => api.get('/todos')
})

// An entity is a single item
const userEntity = defineEntity({
  name: 'currentUser',
  fetch: () => api.get('/me')
})

// Define mutations separately
const createTodo = defineMutation({
  mutate: (params: { title: string }) => api.post('/todos', params)
})
```

### 2. Use in components

```tsx
import { useQuery, useMutation } from 'query-optimistic'

function TodoApp() {
  const [todos, { isLoading }] = useQuery(todosCollection)
  const [user] = useQuery(userEntity)

  const { mutate: addTodo, isPending } = useMutation(createTodo, {
    optimistic: (channel, params) => {
      channel(todosCollection).append({
        id: `temp-${Date.now()}`,
        title: params.title,
        completed: false,
      }, { sync: true })
    }
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <button
        onClick={() => addTodo({ title: 'New task' })}
        disabled={isPending}
      >
        Add Todo
      </button>
      <ul>
        {todos?.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Examples

### Todo List with CRUD Operations

A complete todo list with create, update, toggle, and delete operations:

```tsx
import { defineCollection, defineMutation, useQuery, useMutation } from 'query-optimistic'

interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

// Define the collection
const todosCollection = defineCollection<Todo>({
  name: 'todos',
  id: (todo) => todo.id,
  fetch: () => fetch('/api/todos').then(r => r.json())
})

// Define mutations
const createTodo = defineMutation<{ title: string }, Todo>({
  mutate: (params) => fetch('/api/todos', {
    method: 'POST',
    body: JSON.stringify(params)
  }).then(r => r.json())
})

const toggleTodo = defineMutation<{ id: string; completed: boolean }, Todo>({
  mutate: ({ id, completed }) => fetch(`/api/todos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed })
  }).then(r => r.json())
})

const deleteTodo = defineMutation<{ id: string }, void>({
  mutate: ({ id }) => fetch(`/api/todos/${id}`, { method: 'DELETE' })
})

// Component
function TodoList() {
  const [todos, { isLoading }] = useQuery(todosCollection)

  const { mutate: create } = useMutation(createTodo, {
    optimistic: (channel, params) => {
      channel(todosCollection).append({
        id: `temp-${Date.now()}`,
        title: params.title,
        completed: false,
        createdAt: new Date().toISOString()
      }, { sync: true })
    }
  })

  const { mutate: toggle } = useMutation(toggleTodo, {
    optimistic: (channel, params) => {
      channel(todosCollection).update(params.id, todo => ({
        ...todo,
        completed: params.completed
      }))
    }
  })

  const { mutate: remove } = useMutation(deleteTodo, {
    optimistic: (channel, params) => {
      channel(todosCollection).delete(params.id)
    }
  })

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('title') as HTMLInputElement
        create({ title: input.value })
        input.value = ''
      }}>
        <input name="title" placeholder="What needs to be done?" />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos?.map(todo => (
          <li
            key={todo.id}
            style={{ opacity: todo._optimistic?.status === 'pending' ? 0.6 : 1 }}
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggle({ id: todo.id, completed: !todo.completed })}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.title}
            </span>
            <button onClick={() => remove({ id: todo.id })}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

### Shopping Cart

Real-time cart updates with quantity management:

```tsx
interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
}

interface CartSummary {
  itemCount: number
  total: number
}

const cartCollection = defineCollection<CartItem>({
  name: 'cart',
  id: (item) => item.id,
  fetch: () => api.get('/cart/items')
})

const cartSummaryEntity = defineEntity<CartSummary>({
  name: 'cartSummary',
  fetch: () => api.get('/cart/summary')
})

const updateQuantity = defineMutation<{ id: string; quantity: number }, CartItem>({
  mutate: ({ id, quantity }) => api.patch(`/cart/items/${id}`, { quantity })
})

const removeFromCart = defineMutation<{ id: string }, void>({
  mutate: ({ id }) => api.delete(`/cart/items/${id}`)
})

function Cart() {
  const [items] = useQuery(cartCollection)
  const [summary] = useQuery(cartSummaryEntity)

  const { mutate: updateQty } = useMutation(updateQuantity, {
    optimistic: (channel, params) => {
      // Update the item quantity
      channel(cartCollection).update(params.id, item => ({
        ...item,
        quantity: params.quantity
      }))

      // Update the summary
      channel(cartSummaryEntity).update(s => {
        const item = items?.find(i => i.id === params.id)
        const diff = params.quantity - (item?.quantity ?? 0)
        return {
          itemCount: s.itemCount + diff,
          total: s.total + (item?.price ?? 0) * diff
        }
      })
    }
  })

  const { mutate: remove } = useMutation(removeFromCart, {
    optimistic: (channel, params) => {
      const item = items?.find(i => i.id === params.id)

      channel(cartCollection).delete(params.id)

      channel(cartSummaryEntity).update(s => ({
        itemCount: s.itemCount - (item?.quantity ?? 0),
        total: s.total - (item?.price ?? 0) * (item?.quantity ?? 0)
      }))
    }
  })

  return (
    <div>
      <h2>Cart ({summary?.itemCount} items)</h2>
      {items?.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <select
            value={item.quantity}
            onChange={(e) => updateQty({ id: item.id, quantity: +e.target.value })}
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
          </select>
          <span>${(item.price * item.quantity).toFixed(2)}</span>
          <button onClick={() => remove({ id: item.id })}>Remove</button>
        </div>
      ))}
      <div><strong>Total: ${summary?.total.toFixed(2)}</strong></div>
    </div>
  )
}
```

---

### Social Media Feed with Likes

Instant feedback for user interactions:

```tsx
interface Post {
  id: string
  author: { name: string; avatar: string }
  content: string
  likes: number
  likedByMe: boolean
  createdAt: string
}

const feedCollection = defineCollection<Post, { page?: number }>({
  name: 'feed',
  id: (post) => post.id,
  fetch: ({ page = 1 }) => api.get(`/feed?page=${page}`)
})

const likePost = defineMutation<{ postId: string }, void>({
  mutate: ({ postId }) => api.post(`/posts/${postId}/like`)
})

const unlikePost = defineMutation<{ postId: string }, void>({
  mutate: ({ postId }) => api.delete(`/posts/${postId}/like`)
})

function Feed() {
  const [posts, query, pagination] = useQuery(feedCollection, {
    paginated: true,
    getPageParams: ({ pageParam = 1 }) => ({ page: pageParam })
  })

  const { mutate: like } = useMutation(likePost, {
    optimistic: (channel, params) => {
      channel(feedCollection).update(params.postId, post => ({
        ...post,
        likes: post.likes + 1,
        likedByMe: true
      }))
    }
  })

  const { mutate: unlike } = useMutation(unlikePost, {
    optimistic: (channel, params) => {
      channel(feedCollection).update(params.postId, post => ({
        ...post,
        likes: post.likes - 1,
        likedByMe: false
      }))
    }
  })

  return (
    <div>
      {posts?.map(post => (
        <article key={post.id}>
          <header>
            <img src={post.author.avatar} alt={post.author.name} />
            <span>{post.author.name}</span>
          </header>
          <p>{post.content}</p>
          <footer>
            <button onClick={() =>
              post.likedByMe
                ? unlike({ postId: post.id })
                : like({ postId: post.id })
            }>
              {post.likedByMe ? '❤️' : '🤍'} {post.likes}
            </button>
          </footer>
        </article>
      ))}

      {pagination.hasNextPage && (
        <button
          onClick={() => pagination.fetchNextPage()}
          disabled={pagination.isFetchingNextPage}
        >
          {pagination.isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

---

### Real-time Collaboration

Update multiple users viewing the same data:

```tsx
interface Document {
  id: string
  title: string
  content: string
  lastEditedBy: string
  updatedAt: string
}

const documentEntity = defineEntity<Document, string>({
  name: 'document',
  fetch: (docId) => api.get(`/documents/${docId}`)
})

const updateDocument = defineMutation<{ id: string; content: string }, Document>({
  mutate: ({ id, content }) => api.patch(`/documents/${id}`, { content })
})

function DocumentEditor({ docId }: { docId: string }) {
  const [doc, { isLoading }] = useQuery(documentEntity, { params: docId })
  const [localContent, setLocalContent] = useState('')

  useEffect(() => {
    if (doc) setLocalContent(doc.content)
  }, [doc?.content])

  const { mutate: save, isPending } = useMutation(updateDocument, {
    optimistic: (channel, params) => {
      channel(documentEntity).update(d => ({
        ...d,
        content: params.content,
        updatedAt: new Date().toISOString(),
        lastEditedBy: 'You'
      }))
    }
  })

  // Auto-save with debounce
  const debouncedSave = useMemo(
    () => debounce((content: string) => save({ id: docId, content }), 1000),
    [docId, save]
  )

  if (isLoading) return <div>Loading document...</div>

  return (
    <div>
      <header>
        <h1>{doc?.title}</h1>
        <span>
          {isPending ? 'Saving...' : `Last edited by ${doc?.lastEditedBy}`}
        </span>
      </header>
      <textarea
        value={localContent}
        onChange={(e) => {
          setLocalContent(e.target.value)
          debouncedSave(e.target.value)
        }}
      />
    </div>
  )
}
```

---

### Drag and Drop Reordering

Optimistic reordering for smooth UX:

```tsx
interface Task {
  id: string
  title: string
  order: number
}

const tasksCollection = defineCollection<Task>({
  name: 'tasks',
  id: (task) => task.id,
  fetch: () => api.get('/tasks')
})

const reorderTask = defineMutation<{ id: string; newOrder: number }, Task[]>({
  mutate: ({ id, newOrder }) => api.post(`/tasks/${id}/reorder`, { order: newOrder })
})

function TaskBoard() {
  const [tasks] = useQuery(tasksCollection)
  const sortedTasks = useMemo(
    () => tasks?.slice().sort((a, b) => a.order - b.order),
    [tasks]
  )

  const { mutate: reorder } = useMutation(reorderTask, {
    optimistic: (channel, params) => {
      channel(tasksCollection).updateWhere(
        () => true, // Update all tasks
        (task) => {
          if (task.id === params.id) {
            return { ...task, order: params.newOrder }
          }
          // Shift other tasks
          if (task.order >= params.newOrder) {
            return { ...task, order: task.order + 1 }
          }
          return task
        }
      )
    }
  })

  const handleDrop = (draggedId: string, targetIndex: number) => {
    reorder({ id: draggedId, newOrder: targetIndex })
  }

  return (
    <div>
      {sortedTasks?.map((task, index) => (
        <div
          key={task.id}
          draggable
          onDrop={() => handleDrop(task.id, index)}
        >
          {task.title}
        </div>
      ))}
    </div>
  )
}
```

---

## API Reference

### Definitions

#### `defineCollection<TData, TParams>(config)`

Define a collection (array of items).

```typescript
const collection = defineCollection<User, { page: number }>({
  name: 'users',              // Unique identifier
  id: (user) => user.id,      // How to identify items
  fetch: (params) => api.get(`/users?page=${params.page}`)
})
```

#### `defineEntity<TData, TParams>(config)`

Define an entity (single item).

```typescript
const entity = defineEntity<Profile, string>({
  name: 'profile',
  fetch: (userId) => api.get(`/users/${userId}/profile`)
})
```

#### `defineMutation<TParams, TResponse>(config)`

Define a mutation.

```typescript
const mutation = defineMutation<{ name: string }, User>({
  name: 'createUser',  // Optional: used as mutation key
  mutate: (params) => api.post('/users', params)
})
```

---

### Hooks

#### `useQuery(definition, options?)`

Fetch data from a collection or entity.

```typescript
// Collection
const [users, queryState] = useQuery(usersCollection)
const [users, queryState] = useQuery(usersCollection, { params: { page: 2 } })

// Entity
const [profile, queryState] = useQuery(profileEntity, { params: userId })

// Paginated
const [posts, queryState, pagination] = useQuery(postsCollection, {
  paginated: true,
  getPageParams: ({ pageParam = 1 }) => ({ page: pageParam })
})
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `params` | `TParams` | Parameters for fetch function |
| `enabled` | `boolean` | Enable/disable query |
| `staleTime` | `number` | Time before data is stale (ms) |
| `refetchOnMount` | `boolean` | Refetch on component mount |
| `refetchOnWindowFocus` | `boolean` | Refetch when window focuses |
| `refetchInterval` | `number` | Polling interval (ms) |
| `paginated` | `boolean` | Enable infinite query mode |
| `getPageParams` | `function` | Transform page context to params |

**Returns:**
- `data` - The fetched data (or `undefined`)
- `queryState` - `{ isLoading, isFetching, error, refetch, ... }`
- `pagination` (paginated only) - `{ hasNextPage, fetchNextPage, isFetchingNextPage, ... }`

---

#### `useMutation(definition, options?)`

Execute mutations with optional optimistic updates.

```typescript
const { mutate, mutateAsync, isPending, isError, error, data, reset } = useMutation(
  createUser,
  {
    optimistic: (channel, params) => {
      channel(usersCollection).append(params, { sync: true })
    },
    onSuccess: (data) => console.log('Created:', data),
    onError: (error) => console.error('Failed:', error)
  }
)
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `optimistic` | `(channel, params) => void` | Apply optimistic updates |
| `onMutate` | `(params) => void` | Called when mutation starts |
| `onSuccess` | `(data, params) => void` | Called on success |
| `onError` | `(error, params) => void` | Called on error |

---

### Channel API

The channel provides intuitive methods for optimistic updates.

#### Collection Methods

```typescript
optimistic: (channel, params) => {
  const ch = channel(usersCollection)

  // Add items
  ch.prepend(newItem, { sync: true })  // Add to beginning
  ch.append(newItem, { sync: true })   // Add to end

  // Update by ID
  ch.update(id, item => ({ ...item, name: newName }))

  // Update matching items
  ch.updateWhere(
    item => item.status === 'active',
    item => ({ ...item, highlighted: true })
  )

  // Delete by ID
  ch.delete(id)

  // Delete matching items
  ch.deleteWhere(item => item.expired)
}
```

#### Entity Methods

```typescript
optimistic: (channel, params) => {
  const ch = channel(profileEntity)

  // Partial update
  ch.update(profile => ({ ...profile, name: newName }))

  // Full replacement
  ch.replace(newProfile)
}
```

#### Sync Option

Use `{ sync: true }` when the server response should replace the optimistic data:

```typescript
// The temp ID will be replaced with the server's real ID
channel(todosCollection).append({
  id: `temp-${Date.now()}`,
  title: 'New todo'
}, { sync: true })
```

---

### Standalone Channel

Use outside mutations for manual control:

```typescript
import { channel } from 'query-optimistic'

async function handleQuickAction(postId: string) {
  // Apply immediately
  const rollback = channel(postsCollection).update(postId, post => ({
    ...post,
    likes: post.likes + 1
  }))

  try {
    await api.post(`/posts/${postId}/like`)
  } catch (error) {
    rollback() // Undo on failure
  }
}
```

---

### Optimistic Status

Track pending operations in your UI:

```typescript
interface OptimisticMeta {
  status: 'pending' | 'error'
  error?: Error
}

// Available on items during optimistic updates
{items?.map(item => (
  <div style={{
    opacity: item._optimistic?.status === 'pending' ? 0.5 : 1
  }}>
    {item.name}
    {item._optimistic?.status === 'error' && (
      <span className="error">Failed to save</span>
    )}
  </div>
))}
```

---

## TypeScript

Full type inference flows from definitions to usage:

```typescript
// Define with types
const usersCollection = defineCollection<User, { page: number }>({
  name: 'users',
  id: (user) => user.id,  // user: User
  fetch: ({ page }) => api.get(`/users?page=${page}`)  // page: number
})

const createUser = defineMutation<CreateUserParams, User>({
  mutate: (params) => api.post('/users', params)  // params: CreateUserParams
})

// Types flow automatically
const [users] = useQuery(usersCollection, {
  params: { page: 1 }  // TypeScript enforces { page: number }
})
// users: User[] | undefined

const { mutate } = useMutation(createUser, {
  optimistic: (channel, params) => {
    // params: CreateUserParams (inferred)
    channel(usersCollection).append({
      // TypeScript ensures this matches User
    })
  }
})
// mutate: (params: CreateUserParams) => void
```

---

## Submodule Imports

```typescript
// Full library
import { defineCollection, useQuery, useMutation } from 'query-optimistic'

// Core only (no React dependency)
import { defineCollection, defineEntity, defineMutation, channel } from 'query-optimistic/core'

// React hooks only
import { useQuery, useMutation } from 'query-optimistic/react'
```

---

## Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | >= 18.0.0 |
| `@tanstack/react-query` | >= 5.0.0 |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Made with care for the React community
</p>
