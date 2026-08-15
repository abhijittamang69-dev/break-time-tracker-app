import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import History from './pages/History';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Devices from './pages/Devices';
import DeviceAccessDenied from './components/DeviceAccessDenied';
import storage from './utils/storage';

function App() {
  const { user, loading } = useAuth();

  // Check if device access is restricted
  const deviceError = storage.get('deviceError');
  if (deviceError) {
    return <DeviceAccessDenied />;
  }

  if (loading) {
    return (
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
  }

  // Not logged in - show login page at root
  if (!user) {
    return <Login />;
  }

  // Logged in - show app routes
  return (
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
  );
}

export default App;
