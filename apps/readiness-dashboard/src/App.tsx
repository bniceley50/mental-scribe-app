import { useState, useEffect } from 'react';
import './App.css';
import HealthStatus from './components/HealthStatus';
import MetricsOverview from './components/MetricsOverview';
import AuditChainStatus from './components/AuditChainStatus';
import DeploymentStatus from './components/DeploymentStatus';

interface DashboardConfig {
  supabaseUrl: string;
  functionPrefix: string;
}

function App() {
  const [config, setConfig] = useState<DashboardConfig>({
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    functionPrefix: import.meta.env.VITE_FUNCTION_PREFIX || '',
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (key: keyof DashboardConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🏥 Mental Scribe Production Readiness</h1>
        <div className="header-info">
          <span className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </header>

      <div className="config-panel">
        <h3>Configuration</h3>
        <div className="config-inputs">
          <label>
            Supabase URL:
            <input
              type="text"
              value={config.supabaseUrl}
              onChange={(e) => handleConfigChange('supabaseUrl', e.target.value)}
              placeholder="https://your-project.supabase.co"
            />
          </label>
          <label>
            Function Prefix:
            <input
              type="text"
              value={config.functionPrefix}
              onChange={(e) => handleConfigChange('functionPrefix', e.target.value)}
              placeholder="/functions/v1"
            />
          </label>
        </div>
      </div>

      <div className="dashboard-grid">
        <HealthStatus
          baseUrl={config.supabaseUrl}
          functionPrefix={config.functionPrefix}
          refreshTrigger={lastUpdate}
        />
        <MetricsOverview
          baseUrl={config.supabaseUrl}
          functionPrefix={config.functionPrefix}
          refreshTrigger={lastUpdate}
        />
        <AuditChainStatus
          baseUrl={config.supabaseUrl}
          functionPrefix={config.functionPrefix}
          refreshTrigger={lastUpdate}
        />
        <DeploymentStatus />
      </div>

      <footer className="footer">
        <p>
          Mental Scribe Production Readiness Dashboard v1.0.0 | 
          Monitoring {config.supabaseUrl || 'not configured'}
        </p>
      </footer>
    </div>
  );
}

export default App;
