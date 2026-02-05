# query-optimistic Next.js Example

Comprehensive Next.js example demonstrating all features of `query-optimistic`.

## Getting Started

```bash
cd example
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## QueryState Properties

The `useQuery` hook returns a tuple where the second element contains rich state information:

```typescript
const [data, queryState] = useQuery(collection);

// Available properties:
queryState.isLoading        // True when fetching for the first time
queryState.isFetching       // True when any fetch is in progress
queryState.isSuccess        // True when query succeeded
queryState.isError          // True when query failed
queryState.isPending        // Alias for isLoading (TanStack v5 naming)
queryState.status           // 'pending' | 'error' | 'success'
queryState.error            // Error object if isError is true
queryState.dataUpdatedAt    // Timestamp of last data update
queryState.errorUpdatedAt   // Timestamp of last error
queryState.failureCount     // Number of times query failed
queryState.isStale          // True if data is stale
queryState.isPlaceholderData // True if showing placeholder data
queryState.refetch          // Function to manually refetch
```

## Project Structure

```
example/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   ├── providers.tsx       # React Query provider
│   ├── todos/page.tsx      # Todo list route
│   ├── profile/page.tsx    # User profile route
│   ├── feed/page.tsx       # Infinite feed route
│   ├── cart/page.tsx       # Shopping cart route
│   └── advanced/page.tsx   # Advanced patterns route
├── components/             # React components
│   ├── Navigation.tsx
│   ├── TodoList.tsx        # Shows isSuccess, isStale, dataUpdatedAt
│   ├── UserProfile.tsx     # Shows isSuccess, isPending, status
│   ├── InfiniteFeed.tsx    # Shows isSuccess, dataUpdatedAt
│   ├── ShoppingCart.tsx    # Multi-query isSuccess
│   └── AdvancedPatterns.tsx # Shows ALL QueryState properties
├── lib/
│   ├── api.ts              # Mock API
│   └── definitions.ts      # Collection/entity/mutation definitions
└── package.json
```

## Features by Route

### `/todos` - Basic CRUD
- `defineCollection`, `useQuery`, `useMutation`
- `channel.prepend()`, `channel.update()`, `channel.delete()`
- QueryState: `isLoading`, `isSuccess`, `isFetching`, `isStale`, `dataUpdatedAt`, `status`

### `/profile` - Entity Queries
- `defineEntity`, entity params
- `channel.update()` for entities
- QueryState: `isSuccess`, `isPending`, `status`

### `/feed` - Pagination
- `paginated: true`, `getPageParams`
- `pagination.fetchNextPage()`, `pagination.hasNextPage`
- QueryState: `isSuccess`, `dataUpdatedAt`

### `/cart` - Multi-Query Updates
- Multiple collections/entities
- `channel.append()`, `channel.deleteWhere()`, `channel.replace()`
- QueryState: `isSuccess` on multiple queries

### `/advanced` - All Features
- **Displays ALL QueryState properties live**
- Query options: `enabled`, `staleTime`, `cacheTime`, `refetchInterval`
- Standalone `channel()` for WebSocket patterns
- Mutation callbacks: `onMutate`, `onSuccess`, `onError`
