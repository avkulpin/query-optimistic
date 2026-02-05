export default function HomePage() {
  return (
    <div className="home-intro">
      <h2>Welcome to query-optimistic</h2>
      <p>Select an example from the navigation above to see different features in action.</p>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>defineCollection</h3>
          <p>Define reusable data collections with automatic ID extraction for optimistic updates.</p>
        </div>
        <div className="feature-card">
          <h3>defineEntity</h3>
          <p>Define single-object entities like user profiles or settings.</p>
        </div>
        <div className="feature-card">
          <h3>defineMutation</h3>
          <p>Define mutations for create, update, and delete operations.</p>
        </div>
        <div className="feature-card">
          <h3>useQuery</h3>
          <p>Fetch data with rich state: isLoading, isSuccess, isStale, dataUpdatedAt, and more.</p>
        </div>
        <div className="feature-card">
          <h3>useMutation</h3>
          <p>Execute mutations with intuitive optimistic updates via the channel API.</p>
        </div>
        <div className="feature-card">
          <h3>Channel API</h3>
          <p>prepend, append, update, updateWhere, delete, deleteWhere, replace</p>
        </div>
      </div>
    </div>
  );
}
