'use client';

/**
 * InfiniteFeed Example
 *
 * Demonstrates:
 * - useQuery with paginated option (infinite scrolling)
 * - Full TanStack Query infinite query result object
 * - hasNextPage, fetchNextPage, isFetchingNextPage on query object
 */

import { useQuery, useMutation } from 'query-optimistic';
import { postsCollection, likePostMutation } from '@/lib/definitions';

export function InfiniteFeed() {
  // Paginated query returns [data, infiniteQueryResult]
  // All pagination methods are on the query object directly
  const [posts, query] = useQuery(postsCollection, {
    paginated: true,
    getPageParams: ({ pageParam }) => ({ page: pageParam ?? 1 }),
  });

  const { mutate: likePost } = useMutation(likePostMutation, {
    optimistic: (channel, params) => {
      channel(postsCollection).update(params.id, (post) => ({
        ...post,
        likes: post.likes + 1,
      }));
    },
  });

  if (query.isLoading) {
    return <div className="loading">Loading feed...</div>;
  }

  if (query.isError) {
    return <div className="error">Error loading feed: {query.error?.message}</div>;
  }

  return (
    <div className="infinite-feed">
      <h2>Social Feed</h2>

      <div className="query-state-info">
        {query.isSuccess && <span className="status-badge success">isSuccess</span>}
        {query.dataUpdatedAt > 0 && (
          <span className="status-badge time">
            Updated: {new Date(query.dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="posts">
        {posts?.map((post) => (
          <article
            key={post.id}
            className="post-card"
            style={{ opacity: post._optimistic?.status === 'pending' ? 0.7 : 1 }}
          >
            <header className="post-header">
              <strong>{post.authorName}</strong>
              <time>{new Date(post.createdAt).toLocaleDateString()}</time>
            </header>
            <p className="post-content">{post.content}</p>
            <footer className="post-footer">
              <button
                className="like-button"
                onClick={() => likePost({ id: post.id })}
                disabled={post._optimistic?.status === 'pending'}
              >
                <span>❤️</span>
                <span className="count">{post.likes}</span>
              </button>
            </footer>
          </article>
        ))}
      </div>

      {/* Pagination - all methods are on the query object */}
      <div className="load-more">
        {query.isFetchingNextPage ? (
          <div className="loading-indicator">Loading more posts...</div>
        ) : query.hasNextPage ? (
          <button onClick={() => query.fetchNextPage()} className="load-more-btn">
            Load More Posts
          </button>
        ) : (
          <p className="end-message">You've reached the end!</p>
        )}
      </div>

      <div className="feed-stats">
        <p>Showing {posts?.length ?? 0} posts</p>
      </div>
    </div>
  );
}
