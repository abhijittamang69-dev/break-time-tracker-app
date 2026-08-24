import { useState, useEffect } from 'react';
import { getAllDevices, approveDevice, rejectDevice, deactivateDevice, activateDevice, deleteDevice } from '../api/devices';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionId, setActionId] = useState(null);

  const isAdmin = user?.role === 'Admin';

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

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await approveDevice(id);
      showToast('Device approved successfully', 'success');
      fetchDevices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve', 'error');
    } finally { setActionId(null); }
  };

  const handleReject = async (id) => {
    setActionId(id);
    try {
      await rejectDevice(id);
      showToast('Device rejected', 'success');
      fetchDevices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject', 'error');
    } finally { setActionId(null); }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this device? This action cannot be undone.')) return;
    setActionId(id);
    try {
      await deleteDevice(id);
      showToast('Device deleted successfully', 'success');
      fetchDevices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete device', 'error');
      setActionId(null);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i></div>;

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="restricted-icon">
          <i className="fas fa-lock" style={{ fontSize: 32, color: 'var(--warning)' }}></i>
        </div>
        <h2 className="restricted-title">Access Restricted</h2>
        <p className="restricted-text">Only Administrators can manage registered devices.</p>
      </div>
    );
  }

  // Keep only the latest device per user per status category
  const getLatestPerUser = (deviceList) => {
    const map = new Map();
    deviceList.forEach(d => {
      const uid = d.userId?._id?.toString() || d.userId?.toString();
      if (!uid) return;
      const existing = map.get(uid);
      if (!existing || new Date(d.createdAt) > new Date(existing.createdAt)) {
        map.set(uid, d);
      }
    });
    return Array.from(map.values());
  };

  const adminDevices = getLatestPerUser(devices.filter(d => d.userId?.role === 'Admin'));
  const nonAdminDevices = devices.filter(d => d.userId?.role !== 'Admin');
  const pendingDevices = getLatestPerUser(nonAdminDevices.filter(d => d.status === 'pending'));
  const approvedDevices = getLatestPerUser(nonAdminDevices.filter(d => d.status === 'approved'));
  const rejectedDevices = getLatestPerUser(nonAdminDevices.filter(d => d.status === 'rejected'));

  const DeviceTable = ({ list, showApprove, showReject, showDeactivate, showActivate, showDelete, readOnly }) => (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr><th>User</th><th>Device</th><th>Status</th><th>Registered</th>{!readOnly && <th>Actions</th>}</tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={readOnly ? 4 : 5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 30 }}>No devices</td></tr>
          ) : (
            list.map(d => (
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
                  {d.status === 'pending' && <span className="badge badge-blue"><i className="fas fa-hourglass-half" style={{ fontSize: 8 }}></i> Pending</span>}
                  {d.status === 'approved' && d.isActive && <span className="badge badge-success"><i className="fas fa-check-circle" style={{ fontSize: 8 }}></i> Active</span>}
                  {d.status === 'approved' && !d.isActive && <span className="badge badge-warning"><i className="fas fa-ban" style={{ fontSize: 8 }}></i> Deactivated</span>}
                  {d.status === 'rejected' && <span className="badge badge-gray"><i className="fas fa-times" style={{ fontSize: 8 }}></i> Rejected</span>}
                </td>
                <td>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}</td>
                {!readOnly && (
                  <td>
                    {showApprove && (
                      <button className="btn btn-success" onClick={() => handleApprove(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '8px 12px', fontSize: 12, marginRight: 6 }}>
                        {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>} Approve
                      </button>
                    )}
                    {showReject && (
                      <button className="btn btn-warning" onClick={() => handleReject(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '8px 12px', fontSize: 12, marginRight: 6 }}>
                        {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-times"></i>} Reject
                      </button>
                    )}
                    {showDeactivate && d.isActive && (
                      <button className="btn btn-warning" onClick={() => handleDeactivate(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '8px 12px', fontSize: 12, marginRight: 6 }}>
                        {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-ban"></i>} Deactivate
                      </button>
                    )}
                    {showActivate && !d.isActive && (
                      <button className="btn btn-success" onClick={() => handleActivate(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '8px 12px', fontSize: 12, marginRight: 6 }}>
                        {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>} Activate
                      </button>
                    )}
                    {showDelete && (
                      <button className="btn btn-danger" onClick={() => handleDelete(d._id)} disabled={actionId === d._id} style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }}>
                        {actionId === d._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-trash-alt"></i>} Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">Device Management</h1>
      <p className="page-subtitle">Approve, reject, and manage registered devices</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><i className="fas fa-mobile-alt"></i></div>
          <div className="stat-value">{devices.length}</div>
          <div className="stat-label">Total Devices</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><i className="fas fa-check-circle"></i></div>
          <div className="stat-value">{approvedDevices.filter(d => d.isActive).length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><i className="fas fa-hourglass-half"></i></div>
          <div className="stat-value">{pendingDevices.length}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><i className="fas fa-ban"></i></div>
          <div className="stat-value">{rejectedDevices.length + approvedDevices.filter(d => !d.isActive).length}</div>
          <div className="stat-label">Inactive</div>
        </div>
      </div>

      {/* Pending Devices */}
      {pendingDevices.length > 0 && (
        <div className="card" style={{ border: '2px solid var(--primary)', marginBottom: 16 }}>
          <div className="card-header" style={{ background: 'var(--primary-light)' }}>
            <h3><i className="fas fa-hourglass-half" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Pending Approval</h3>
            <span className="badge badge-blue">{pendingDevices.length} pending</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DeviceTable list={pendingDevices} showApprove showReject showDelete />
          </div>
        </div>
      )}

      {/* Approved Devices */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-check-circle" style={{ marginRight: 8, color: 'var(--success)' }}></i>Approved Devices</h3>
          <span className="badge badge-success">{approvedDevices.length} approved</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <DeviceTable list={approvedDevices} showDeactivate showActivate showDelete />
        </div>
      </div>

      {/* Rejected Devices */}
      {rejectedDevices.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-times-circle" style={{ marginRight: 8, color: 'var(--warning)' }}></i>Rejected Devices</h3>
            <span className="badge badge-gray">{rejectedDevices.length} rejected</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DeviceTable list={rejectedDevices} showActivate showDelete />
          </div>
        </div>
      )}

      {/* Admin Devices - read only, no actions */}
      {adminDevices.length > 0 && (
        <div className="card" style={{ marginTop: 16, border: '2px solid var(--success)' }}>
          <div className="card-header" style={{ background: 'var(--success-light)' }}>
            <h3><i className="fas fa-shield-alt" style={{ marginRight: 8, color: 'var(--success)' }}></i>Admin Devices (Auto-Approved)</h3>
            <span className="badge badge-success">{adminDevices.length} admin</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <DeviceTable list={adminDevices} readOnly />
          </div>
        </div>
      )}

      <style>{`
        .page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--gray-100); box-shadow: var(--shadow-sm); transition: all 0.2s; }
        .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 18px; }
        .stat-icon.blue { background: var(--primary-light); color: var(--primary); }
        .stat-icon.green { background: var(--success-light); color: var(--success); }
        .stat-icon.red { background: var(--warning-light); color: var(--warning); }
        .stat-icon.orange { background: var(--orange-light); color: var(--orange); }
        .stat-value { font-size: 24px; font-weight: 800; color: var(--gray-900); line-height: 1; }
        .stat-label { font-size: 12px; color: var(--gray-500); margin-top: 4px; font-weight: 500; }
        .card { background: white; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--gray-100); overflow: hidden; margin-bottom: 16px; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid var(--gray-100); display: flex; align-items: center; justify-content: space-between; }
        .card-header h3 { font-size: 15px; font-weight: 600; color: var(--gray-800); }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: var(--success-light); color: var(--success); }
        .badge-warning { background: var(--warning-light); color: var(--warning); }
        .badge-orange { background: var(--orange-light); color: var(--orange); }
        .badge-blue { background: var(--primary-light); color: var(--primary); }
        .badge-gray { background: var(--gray-100); color: var(--gray-600); }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 500px; }
        .data-table th { text-align: left; padding: 12px 16px; font-weight: 600; color: var(--gray-500); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 1px solid var(--gray-200); }
        .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); }
        .data-table tr:hover td { background: var(--gray-50); }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-success { background: var(--success); color: white; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-danger { background: var(--warning); color: white; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .restricted-icon { width: 80px; height: 80px; border-radius: 50%; background: var(--warning-light); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .restricted-title { font-size: 20px; font-weight: 700; color: var(--gray-900); margin-bottom: 8px; }
        .restricted-text { font-size: 14px; color: var(--gray-500); max-width: 400px; margin: 0 auto; line-height: 1.6; }

        @media (prefers-color-scheme: dark) {
          .stat-card { background: var(--gray-800); border-color: var(--gray-700); }
          .card { background: var(--gray-800); border-color: var(--gray-700); }
          .card-header { border-bottom-color: var(--gray-700); }
          .card-header h3 { color: var(--gray-200); }
          .data-table th { border-bottom-color: var(--gray-600); color: var(--gray-400); }
          .data-table td { border-bottom-color: var(--gray-700); color: var(--gray-200); }
          .data-table tr:hover td { background: var(--gray-700); }
          .restricted-title { color: var(--gray-100); }
          .restricted-text { color: var(--gray-400); }
        }
        @media (max-width: 480px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </div>
  );
};

export default Devices;
