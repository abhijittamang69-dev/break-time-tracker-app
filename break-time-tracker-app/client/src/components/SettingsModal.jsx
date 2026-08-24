import { useState, useEffect } from 'react';
import { changePassword } from '../api/auth';
import { getSettings, updateSettings } from '../api/settings';

const SettingsModal = ({ isAdmin, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    maxBreakMinutes: 60,
    maxBreaksPerShift: 3,
    defaultBreakDuration: 15,
    reminderMinutesBeforeEnd: 5,
    lateThresholdMinutes: 30,
    qrCodeValue: 'BREAK_TIME_QR_2024'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('password');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (err) { console.error(err); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all fields'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match'); return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters'); return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally { setLoading(false); }
  };

  const handleSettingsSave = async () => {
    setSettingsLoading(true);
    try {
      await updateSettings(settings);
      setMessage('Settings updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally { setSettingsLoading(false); }
  };

  const regenerateQR = () => {
    const newValue = 'BREAK_QR_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setSettings(prev => ({ ...prev, qrCodeValue: newValue }));
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-slide-up">
        <div className="modal-header">
          <h3><i className="fas fa-cog" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Settings</h3>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times"></i></button>
        </div>
        <div className="modal-tabs">
          <button className={`modal-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => { setActiveTab('password'); setMessage(''); setError(''); }}>
            <i className="fas fa-lock"></i> Password
          </button>
          {isAdmin && (
            <button className={`modal-tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => { setActiveTab('system'); setMessage(''); setError(''); }}>
              <i className="fas fa-sliders-h"></i> System
            </button>
          )}
          {isAdmin && (
            <button className={`modal-tab ${activeTab === 'qr' ? 'active' : ''}`} onClick={() => { setActiveTab('qr'); setMessage(''); setError(''); }}>
              <i className="fas fa-qrcode"></i> QR
            </button>
          )}
        </div>
        {message && <div className="alert alert-success" style={{ margin: '16px 24px 0' }}><i className="fas fa-check-circle"></i> {message}</div>}
        {error && <div className="alert alert-warning" style={{ margin: '16px 24px 0' }}><i className="fas fa-exclamation-circle"></i> {error}</div>}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Current Password</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock"></i>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock"></i>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock"></i>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '10px 20px' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', padding: '10px 20px' }}>
                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Update Password
              </button>
            </div>
          </form>
        )}

        {activeTab === 'system' && (
          <div>
            <div className="modal-body">
              <div className="form-group">
                <label>Max Break Time Per Shift (minutes)</label>
                <input type="number" min="1" max="480" value={settings.maxBreakMinutes} onChange={(e) => setSettings({...settings, maxBreakMinutes: parseInt(e.target.value) || 60})} style={inputStyle} />
              </div>
              <div className="form-group">
                <label>Max Breaks Per Shift</label>
                <input type="number" min="1" max="20" value={settings.maxBreaksPerShift} onChange={(e) => setSettings({...settings, maxBreaksPerShift: parseInt(e.target.value) || 3})} style={inputStyle} />
              </div>
              <div className="form-group">
                <label>Default Break Duration (minutes)</label>
                <input type="number" min="1" max="120" value={settings.defaultBreakDuration} onChange={(e) => setSettings({...settings, defaultBreakDuration: parseInt(e.target.value) || 15})} style={inputStyle} />
              </div>
              <div className="form-group">
                <label>Reminder Before End (minutes)</label>
                <input type="number" min="1" max="30" value={settings.reminderMinutesBeforeEnd} onChange={(e) => setSettings({...settings, reminderMinutesBeforeEnd: parseInt(e.target.value) || 5})} style={inputStyle} />
              </div>
              <div className="form-group">
                <label>Late Threshold (minutes)</label>
                <input type="number" min="1" max="240" value={settings.lateThresholdMinutes} onChange={(e) => setSettings({...settings, lateThresholdMinutes: parseInt(e.target.value) || 30})} style={inputStyle} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '10px 20px' }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSettingsSave} disabled={settingsLoading} style={{ width: 'auto', padding: '10px 20px' }}>
                {settingsLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Save Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>QR Code Value</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={settings.qrCodeValue} readOnly style={{ ...inputStyle, flex: 1, background: 'var(--gray-100)' }} />
                  <button type="button" className="btn btn-primary" onClick={regenerateQR} style={{ width: 'auto', padding: '10px 16px' }}>
                    <i className="fas fa-sync-alt"></i> Regenerate
                  </button>
                </div>
              </div>
              <div className="qr-preview">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(settings.qrCodeValue)}`}
                  alt="Break QR Code"
                  style={{ width: 200, height: 200 }}
                />
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>Scan this QR code to request a break</div>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleSettingsSave} disabled={settingsLoading} style={{ width: 'auto', padding: '10px 20px' }}>
                {settingsLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>} Save QR Code
              </button>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '10px 20px' }}>Close</button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: white; border-radius: var(--radius-lg); width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--gray-100); display: flex; align-items: center; justify-content: space-between; }
        .modal-header h3 { font-size: 18px; font-weight: 700; color: var(--gray-900); }
        .modal-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--gray-100); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--gray-500); transition: all 0.2s; }
        .modal-close:hover { background: var(--gray-200); color: var(--gray-700); }
        .modal-tabs { display: flex; border-bottom: 1px solid var(--gray-100); }
        .modal-tab { flex: 1; padding: 12px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--gray-500); display: flex; align-items: center; justify-content: center; gap: 8px; font-family: inherit; transition: all 0.2s; }
        .modal-tab.active { color: var(--primary); border-bottom: 2px solid var(--primary); background: var(--primary-light); }
        .modal-tab:hover { color: var(--gray-700); background: var(--gray-50); }
        .modal-body { padding: 24px; }
        .modal-footer { padding: 16px 24px; border-top: 1px solid var(--gray-100); display: flex; gap: 10px; justify-content: flex-end; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
        .input-wrapper { position: relative; }
        .input-wrapper i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--gray-400); font-size: 16px; }
        .input-wrapper input { width: 100%; padding: 12px 16px 12px 44px; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); font-size: 15px; font-family: inherit; transition: all 0.2s; background: var(--gray-50); }
        .input-wrapper input:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1); }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { background: var(--gray-100); color: var(--gray-700); border: 1px solid var(--gray-200); }
        .alert { padding: 14px 16px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .alert-success { background: var(--success-light); color: var(--success); border: 1px solid #bcf0da; }
        .alert-warning { background: var(--warning-light); color: var(--warning); border: 1px solid #fbd5d5; }
        .qr-preview { padding: 20px; background: var(--gray-50); border-radius: 12px; border: 2px dashed var(--gray-300); margin-bottom: 16px; }

        @media (prefers-color-scheme: dark) {
          .modal { background: var(--gray-100); }
          .modal-header { border-bottom-color: var(--gray-700); }
          .modal-header h3 { color: var(--gray-100); }
          .modal-tabs { border-bottom-color: var(--gray-700); }
          .modal-tab { color: var(--gray-400); }
          .modal-tab.active { background: var(--primary-light); color: var(--primary); }
          .modal-tab:hover { color: var(--gray-200); background: var(--gray-200); }
          .modal-footer { border-top-color: var(--gray-700); }
          .modal-close { background: var(--gray-200); color: var(--gray-300); }
          .modal-close:hover { background: var(--gray-300); color: var(--gray-100); }
          .input-wrapper input { background: var(--gray-200); border-color: var(--gray-600); color: var(--gray-100); }
          .input-wrapper input:focus { background: var(--gray-100); }
          .alert-success { border-color: #14532d; }
          .alert-warning { border-color: #7f1d1d; }
          .qr-preview { background: var(--gray-200); border-color: var(--gray-600); }
        }
      `}</style>
    </div>
  );
};

const inputStyle = { width: '100%', padding: '12px 16px', border: '2px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', fontSize: '15px', fontFamily: 'inherit', background: 'var(--gray-50)' };

export default SettingsModal;
