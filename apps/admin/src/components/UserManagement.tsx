import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import './UserManagement.css';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface Activity {
  id: string;
  action: string;
  user_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const supabase: SupabaseClient = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
  );

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadUserActivity(selectedUserId);
    }
  }, [selectedUserId]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);

      // Fetch users from auth.users (requires service role in production)
      // For now, we'll fetch from a custom users table or clients
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('id, email, role, created_at, last_sign_in_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function loadUserActivity(userId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('audit_chain')
        .select('id, action, user_id, timestamp, metadata')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      setActivities(data || []);
    } catch (err) {
      console.error('Failed to load activity:', err);
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Refresh users list
      await loadUsers();
      alert(`User role updated to ${newRole}`);
    } catch (err) {
      alert('Failed to update role: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error">❌ {error}</div>;
  }

  return (
    <div className="user-management">
      <div className="section-header">
        <h2>👥 User Management</h2>
        <button onClick={loadUsers} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="users-grid">
        <div className="users-list">
          <h3>Users ({users.length})</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Last Sign In</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={selectedUserId === user.id ? 'selected' : ''}
                >
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => setSelectedUserId(user.id)}
                        className="view-btn"
                      >
                        👁️
                      </button>
                      <select
                        value={user.role || 'user'}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="empty-state">No users found</div>
          )}
        </div>

        {selectedUserId && (
          <div className="activity-panel">
            <h3>📊 Recent Activity</h3>
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-action">{activity.action}</div>
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <details className="activity-metadata">
                      <summary>Details</summary>
                      <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}

              {activities.length === 0 && (
                <div className="empty-state">No activity found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
