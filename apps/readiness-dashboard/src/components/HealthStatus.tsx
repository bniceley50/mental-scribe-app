import { useState, useEffect } from 'react';

interface HealthStatusProps {
  baseUrl: string;
  functionPrefix: string;
  refreshTrigger: Date;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; latency: number };
    auth: { status: string; latency: number };
    storage: { status: string; latency: number };
  };
}

export default function HealthStatus({ baseUrl, functionPrefix, refreshTrigger }: HealthStatusProps) {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseUrl) {
      setError('Supabase URL not configured');
      setLoading(false);
      return;
    }

    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${baseUrl}${functionPrefix}/health-check`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health status');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [baseUrl, functionPrefix, refreshTrigger]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'healthy': return 'healthy';
      case 'degraded': return 'degraded';
      case 'unhealthy': return 'unhealthy';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="status-card">
        <h2>🏥 System Health</h2>
        <div className="loading">Loading health status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-card">
        <h2>🏥 System Health</h2>
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="status-card">
        <h2>🏥 System Health</h2>
        <div className="error-message">No health data available</div>
      </div>
    );
  }

  return (
    <div className="status-card">
      <h2>
        <span className={`status-indicator status-${health.status}`}></span>
        System Health
      </h2>
      <div className="status-details">
        <div className={`status-row ${getStatusClass(health.status)}`}>
          <span className="status-label">Overall Status</span>
          <span className="status-value">{health.status.toUpperCase()}</span>
        </div>
        <div className={`status-row ${getStatusClass(health.checks.database.status)}`}>
          <span className="status-label">Database</span>
          <span className="status-value">
            {health.checks.database.status} ({health.checks.database.latency}ms)
          </span>
        </div>
        <div className={`status-row ${getStatusClass(health.checks.auth.status)}`}>
          <span className="status-label">Authentication</span>
          <span className="status-value">
            {health.checks.auth.status} ({health.checks.auth.latency}ms)
          </span>
        </div>
        <div className={`status-row ${getStatusClass(health.checks.storage.status)}`}>
          <span className="status-label">Storage</span>
          <span className="status-value">
            {health.checks.storage.status} ({health.checks.storage.latency}ms)
          </span>
        </div>
      </div>
      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
        Last check: {new Date(health.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
