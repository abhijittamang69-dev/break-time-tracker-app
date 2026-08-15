import { useState, useEffect } from 'react';
import { getAllDevices, deactivateDevice, activateDevice } from '../api/devices';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionId, setActionId] = useState(null);

  const isAdmin = ['Supervisor', 'Team Leader', 'Coordinator', 'Admin'].includes(user?.role);

  useEffect(() => { fetchDevices(); }, []);

  const fetchDevices = async () => {
    try {
      const res = await getAllDevices();
      setDevices(res.data);
    } catch (err) {
      showToast('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type) => setToast({ message, type });

  const handleDeactivate = async (id) => {
    setActionId(id);
    try {
      await deactivateDevice(id);
      showToast('Device deactivated successfully', 'success');
      fetchDevices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to deactivate', 'error');
    } finally { setActionId(null); }
  };

  const handleActivate = async (id) => {
    setActionId(id);
    try {
      await activateDevice(id);
      showToast('Device activated successfully', 'success');
      fetchDevices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to activate', 'error');
    } finally { setActionId(null); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i></div>;

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <i className="fas fa-lock" style={{ fontSize: 32, color: 'var(--warning)' }}></i>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', maxWidth: 400, margin: '0 auto' }}>Only Administrators can manage registered devices.</p>
      </div>
    );
  }

  const activeDevices = devices.filter(d => d.isActive);
  const inactiveDevices = devices.filter(d => !d.isActive);

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">Device Management</h1>
      <p className="page-subtitle">Manage registered devices and access control</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fas fa-mobile-alt"></i></div>
          <div className="stat-value">{devices.length}</div>
          <div className="stat-label">Total Devices</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="stat-value">{activeDevices.length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><i className="fas fa-ban"></i></div>
          <div className="stat-value">{inactiveDevices.length}</div>
          <div className="stat-label">Deactivated</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-mobile-alt" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Registered Devices</h3>
          <span className="badge badge-gray">{devices.length} devices</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <i className="fas fa-mobile-alt" style={{ fontSize: 48, color: 'var(--gray-300)', marginBottom: 16 }}></i>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-700)' }}>No devices registered</h4>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Devices will appear here when users login.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Device</th><th>Status</th><th>Last Used</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d._id}>
                    <td>
                      <strong>{d.userId?.name || 'Unknown'}</strong><br/>
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{d.userId?.username || ''} · {d.userId?.role || ''}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{d.deviceName || 'Unknown Device'}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.userAgent || ''}</div>
                    </td>
                    <td>
                      {d.isActive ? (
                        <span className="badge badge-success"><i className="fas fa-check-circle" style={{ fontSize: 8 }}></i> Active</span>
                      ) : (
                        <span className="badge badge-warning"><i className="fas fa-ban" style={{ fontSize: 8 }}></i> Deactivated</span>
                      )}
                    </td>
                    <td>{d.lastUsed ? new Date(d.lastUsed).toLocaleString() : '-'}</td>
                    <td>
                      {d.isActive ? (
                        <button className="btn btn-warning" onClick={() => handleDeactivate(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                          {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-ban"></i>} Deactivate
                        </button>
                      ) : (
                        <button className="btn btn-success" onClick={() => handleActivate(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                          {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>} Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        .page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--gray-100); box-shadow: var(--shadow-sm); transition: all 0.2s; }
        .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 18px; }
        .stat-icon.blue { background: var(--primary-light); color: var(--primary); }
        .stat-icon.green { background: var(--success-light); color: var(--success); }
        .stat-icon.red { background: var(--warning-light); color: var(--warning); }
        .stat-value { font-size: 24px; font-weight: 800; color: var(--gray-900); line-height: 1; }
        .stat-label { font-size: 12px; color: var(--gray-500); margin-top: 4px; font-weight: 500; }
        .card { background: white; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--gray-100); overflow: hidden; margin-bottom: 16px; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid var(--gray-100); display: flex; align-items: center; justify-content: space-between; }
        .card-header h3 { font-size: 15px; font-weight: 600; color: var(--gray-800); }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: var(--success-light); color: var(--success); }
        .badge-warning { background: var(--warning-light); color: var(--warning); }
        .badge-gray { background: var(--gray-100); color: var(--gray-600); }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { text-align: left; padding: 12px 16px; font-weight: 600; color: var(--gray-500); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 1px solid var(--gray-200); }
        .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); }
        .data-table tr:hover td { background: var(--gray-50); }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-success { background: var(--success); color: white; }
        .btn-warning { background: var(--warning); color: white; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 480px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
};

export default Devices;
