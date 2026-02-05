'use client';

/**
 * InfiniteFeed Example
 *
 * Demonstrates:
 * - useQuery with paginated option (infinite scrolling)
 * - QueryState: isSuccess, dataUpdatedAt
 * - getPageParams for transforming page context
 * - pagination state (hasNextPage, fetchNextPage, isFetchingNextPage)
 */

import { useQuery, useMutation } from 'query-optimistic';
import { postsCollection, likePostMutation } from '@/lib/definitions';

export function InfiniteFeed() {
  const [posts, { isLoading, isSuccess, isError, error, dataUpdatedAt }, pagination] = useQuery(
    postsCollection,
    {
      paginated: true,
      getPageParams: ({ pageParam }) => ({ page: pageParam ?? 1 }),
    }
  );

  const { mutate: likePost } = useMutation(likePostMutation, {
    optimistic: (channel, params) => {
      channel(postsCollection).update(params.id, (post) => ({
        ...post,
        likes: post.likes + 1,
      }));
    },
  });

  if (isLoading) {
    return <div className="loading">Loading feed...</div>;
  }

  if (isError) {
    return <div className="error">Error loading feed: {error?.message}</div>;
  }

  return (
    <div className="infinite-feed">
      <h2>Social Feed</h2>

      <div className="query-state-info">
        {isSuccess && <span className="status-badge success">isSuccess</span>}
        {dataUpdatedAt > 0 && (
          <span className="status-badge time">
            Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
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

      <div className="load-more">
        {pagination.isFetchingNextPage ? (
          <div className="loading-indicator">Loading more posts...</div>
        ) : pagination.hasNextPage ? (
          <button onClick={() => pagination.fetchNextPage()} className="load-more-btn">
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
