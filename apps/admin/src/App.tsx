import { useState } from 'react';
import UserManagement from './components/UserManagement';
import RLSPolicyViewer from './components/RLSPolicyViewer';
import './App.css';

type TabType = 'users' | 'rls';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  return (
    <div className="admin-app">
      <header className="admin-header">
        <h1>🔐 Mental Scribe Admin</h1>
        <p>Secure administration and monitoring</p>
      </header>

      <nav className="admin-nav">
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button
          className={activeTab === 'rls' ? 'active' : ''}
          onClick={() => setActiveTab('rls')}
        >
          🛡️ RLS Policies
        </button>
      </nav>

      <main className="admin-content">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'rls' && <RLSPolicyViewer />}
      </main>
    </div>
  );
}
