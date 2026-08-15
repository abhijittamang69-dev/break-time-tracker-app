import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../api/users';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ name: '', username: '', password: 'password123', role: 'Operator', shift: 'Morning' });

  const isApprover = ['Supervisor', 'Team Leader', 'Coordinator', 'Admin'].includes(currentUser?.role);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      showToast('Employee added successfully', 'success');
      setShowAdd(false);
      setFormData({ name: '', username: '', password: 'password123', role: 'Operator', shift: 'Morning' });
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add employee', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteUser(id);
      showToast('Employee deleted', 'success');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    }
  };

  const showToast = (message, type) => setToast({ message, type });

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i></div>;

  // Operators cannot access staff management
  if (!isApprover) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--warning-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <i className="fas fa-lock" style={{ fontSize: 32, color: 'var(--warning)' }}></i>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 8 }}>
          Access Restricted
        </h2>
        <p style={{ fontSize: 14, color: 'var(--gray-500)', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
          Only Supervisors, Team Leaders, Coordinators, and Administrators can access staff management.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'var(--primary-light)',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--primary)'
        }}>
          <i className="fas fa-user"></i>
          Your role: {currentUser?.role}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">Staff Management</h1>
      <p className="page-subtitle">Manage employees and view their status</p>
      {isApprover && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ width: 'auto', padding: '10px 20px' }}>
            <i className="fas fa-plus"></i> Add Employee
          </button>
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-users" style={{ marginRight: 8, color: 'var(--primary)' }}></i>All Staff</h3>
          <span className="badge badge-gray">{users.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {users.map(u => (
            <div className="user-list-item" key={u._id}>
              <div className="employee-avatar">{(u.name || u.username).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name || u.username}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{u.role} · {u.shift} Shift</div>
              </div>
              {isApprover && u._id !== currentUser?.id && u.role !== 'Admin' && (
                <button className="header-btn" onClick={() => handleDelete(u._id)} title="Delete" style={{ marginLeft: 8 }}>
                  <i className="fas fa-trash" style={{ color: 'var(--warning)', fontSize: 12 }}></i>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {showAdd && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h3><i className="fas fa-user-plus" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Add Employee</h3>
              <button className="modal-close" onClick={() => setShowAdd(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <i className="fas fa-user"></i>
                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <i className="fas fa-id-card"></i>
                    <input type="text" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <i className="fas fa-lock"></i>
                    <input type="text" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Enter password" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={selStyle}>
                    <option value="Operator">Operator</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Shift</label>
                  <select value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })} style={selStyle}>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Night">Night</option>
                    <option value="Rotating">Rotating</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} style={{ width: 'auto', padding: '10px 20px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }}><i className="fas fa-plus"></i> Add Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: var(--primary-dark); }
        .btn-secondary { background: var(--gray-100); color: var(--gray-700); border: 1px solid var(--gray-200); }
        .card { background: white; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--gray-100); overflow: hidden; margin-bottom: 16px; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid var(--gray-100); display: flex; align-items: center; justify-content: space-between; }
        .card-header h3 { font-size: 15px; font-weight: 600; color: var(--gray-800); }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-gray { background: var(--gray-100); color: var(--gray-600); }
        .user-list-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--gray-100); }
        .user-list-item:last-child { border-bottom: none; }
        .employee-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
        .header-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--gray-200); background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--gray-500); transition: all 0.2s; }
        .header-btn:hover { background: var(--gray-100); color: var(--gray-700); }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--gray-100); display: flex; align-items: center; justify-content: space-between; }
        .modal-header h3 { font-size: 18px; font-weight: 700; }
        .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--gray-100); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--gray-500); transition: all 0.2s; }
        .modal-close:hover { background: var(--gray-200); color: var(--gray-700); }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--gray-100); display: flex; gap: 10px; justify-content: flex-end; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
        .input-wrapper { position: relative; }
        .input-wrapper i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 16px; }
        .input-wrapper input { width: 100%; padding: 12px 16px 12px 44px; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 15px; font-family: inherit; transition: all 0.2s; background: var(--gray-50); }
        .input-wrapper input:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1); }
      `}</style>
    </div>
  );
};

const selStyle = { width: '100%', padding: '12px 16px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontSize: '15px', fontFamily: 'inherit', background: 'var(--gray-50)' };

export default Users;
