import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const Login = lazy(() => import('./pages/Login'));
const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Scan = lazy(() => import('./pages/Scan'));
const History = lazy(() => import('./pages/History'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Devices = lazy(() => import('./pages/Devices'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a56db 0%, #1e429f 50%, #0f2c6d 100%)'
  }}>
    <div style={{ textAlign: 'center', color: 'white' }}>
      <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 40, marginBottom: 16 }}></i>
      <p style={{ fontSize: 14, opacity: 0.8 }}>Loading...</p>
    </div>
  </div>
);

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  // Not logged in - show login page at root
  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Login />
      </Suspense>
    );
  }

  // Logged in - show app routes
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="scan" element={<Scan />} />
          <Route path="history" element={<History />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="devices" element={<Devices />} />
        </Route>
        {/* Catch all unknown routes and redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
