import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAccess } from '@/hooks/useAdminAccess';

// Lazy load the admin module from the remote
const AdminApp = lazy(() =>
  import('admin/AdminApp').catch(() => {
    console.error('Failed to load admin module');
    return { default: () => <div>Failed to load admin panel</div> };
  })
);

export default function AdminPage() {
  const { isAdmin, loading } = useAdminAccess();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}>
          <h2>🔐 Checking Admin Access...</h2>
          <p>Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense
      fallback={
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}>
            <h2>Loading Admin Panel...</h2>
            <p>Please wait while we load the administration interface.</p>
          </div>
        </div>
      }
    >
      <AdminApp />
    </Suspense>
  );
}
