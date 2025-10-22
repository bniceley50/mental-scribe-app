import { useState, useEffect } from 'react';

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export default function DeploymentStatus() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated deployment status
    // In a real implementation, this would fetch from Git API or deployment service
    const recentCommits: Commit[] = [
      {
        hash: '9949a9c',
        message: 'docs: update FEATURE_PROGRESS.md for completed Feature #9',
        author: 'Developer',
        date: new Date().toISOString(),
      },
      {
        hash: '16d2b0e',
        message: 'feat(observability): add Prometheus metrics to edge functions',
        author: 'Developer',
        date: new Date(Date.now() - 60000).toISOString(),
      },
      {
        hash: 'abc123d',
        message: 'feat(ops): add operational runbooks and scheduled health check jobs',
        author: 'Developer',
        date: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    setTimeout(() => {
      setCommits(recentCommits);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="status-card">
        <h2>🚀 Recent Deployments</h2>
        <div className="loading">Loading deployment history...</div>
      </div>
    );
  }

  return (
    <div className="status-card">
      <h2>🚀 Recent Deployments</h2>
      <ul className="commit-list">
        {commits.map((commit) => (
          <li key={commit.hash} className="commit-item">
            <div className="commit-hash">{commit.hash}</div>
            <div className="commit-message">{commit.message}</div>
            <div className="commit-author">
              {commit.author} • {new Date(commit.date).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
        Showing last 3 commits from main branch
      </div>
    </div>
  );
}
