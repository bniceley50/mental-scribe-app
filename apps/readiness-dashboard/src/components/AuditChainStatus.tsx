import { useState, useEffect } from 'react';

interface AuditChainStatusProps {
  baseUrl: string;
  functionPrefix: string;
  refreshTrigger: Date;
}

interface AuditVerifyResult {
  intact: boolean;
  totalEntries: number;
  verifiedEntries: number;
  brokenLinks?: Array<{ index: number; reason: string }>;
}

export default function AuditChainStatus({ baseUrl, functionPrefix, refreshTrigger }: AuditChainStatusProps) {
  const [auditStatus, setAuditStatus] = useState<AuditVerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseUrl) {
      setError('Supabase URL not configured');
      setLoading(false);
      return;
    }

    const fetchAuditStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `${baseUrl}${functionPrefix}/audit-verify`;
        
        // Note: This endpoint requires admin authentication
        // In a real implementation, you'd include auth tokens
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
          },
        });
        
        if (!response.ok) {
          // If unauthorized, show a message but don't error completely
          if (response.status === 401 || response.status === 403) {
            setError('Authentication required for audit verification');
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAuditStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit status');
      } finally {
        setLoading(false);
      }
    };

    fetchAuditStatus();
  }, [baseUrl, functionPrefix, refreshTrigger]);

  if (loading) {
    return (
      <div className="status-card">
        <h2>🔐 Audit Chain Status</h2>
        <div className="loading">Verifying audit chain...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-card">
        <h2>🔐 Audit Chain Status</h2>
        <div className="error-message">{error}</div>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
          Configure VITE_SUPABASE_ANON_KEY in .env to enable audit verification
        </p>
      </div>
    );
  }

  if (!auditStatus) {
    return (
      <div className="status-card">
        <h2>🔐 Audit Chain Status</h2>
        <div className="error-message">No audit data available</div>
      </div>
    );
  }

  const integrityStatus = auditStatus.intact ? 'healthy' : 'unhealthy';

  return (
    <div className="status-card">
      <h2>
        <span className={`status-indicator status-${integrityStatus}`}></span>
        Audit Chain Status
      </h2>
      <div className="status-details">
        <div className={`status-row ${integrityStatus}`}>
          <span className="status-label">Chain Integrity</span>
          <span className="status-value">
            {auditStatus.intact ? 'INTACT' : 'COMPROMISED'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Total Entries</span>
          <span className="status-value">{auditStatus.totalEntries}</span>
        </div>
        <div className="status-row">
          <span className="status-label">Verified Entries</span>
          <span className="status-value">{auditStatus.verifiedEntries}</span>
        </div>
        {!auditStatus.intact && auditStatus.brokenLinks && auditStatus.brokenLinks.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>
              ⚠️ Broken Links Detected:
            </div>
            {auditStatus.brokenLinks.map((link, idx) => (
              <div key={idx} className="status-row unhealthy">
                <span className="status-label">Entry {link.index}</span>
                <span className="status-value" style={{ fontSize: '0.75rem' }}>
                  {link.reason}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
