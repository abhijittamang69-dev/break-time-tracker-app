import storage from '../utils/storage';

const DeviceAccessDenied = () => {
  const errorType = storage.get('deviceError');
  const errorDesc = storage.get('deviceErrorDesc');

  const handleLogout = () => {
    storage.remove('token');
    storage.remove('user');
    storage.remove('deviceError');
    storage.remove('deviceErrorDesc');
    window.location.href = '/';
  };

  return (
    <div className="device-denied-page">
      <div className="device-denied-card">
        <div className="device-denied-icon">
          <i className="fas fa-ban"></i>
        </div>

        <h1 className="device-denied-title">Access Restricted</h1>

        <div className="device-denied-alert">
          <p className="device-denied-alert-title">
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            {errorType === 'DEVICE_DEACTIVATED' ? 'Device Deactivated' : 'Unregistered Device'}
          </p>
          <p className="device-denied-alert-text">
            {errorDesc || 'This device is not registered or has been deactivated. Please contact your supervisor or administrator to gain access.'}
          </p>
        </div>

        <button className="device-denied-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          Return to Login
        </button>

        <p className="device-denied-footer">Break Time Tracker App - Device Security</p>
      </div>

      <style>{`
        .device-denied-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%); padding: 20px; }
        .device-denied-card { background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 100%; max-width: 420px; padding: 40px; text-align: center; }
        .device-denied-icon { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .device-denied-icon i { font-size: 36px; color: white; }
        .device-denied-title { font-size: 24px; font-weight: 800; color: #dc2626; margin-bottom: 12px; letter-spacing: -0.5px; }
        .device-denied-alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .device-denied-alert-title { font-size: 14px; color: #991b1b; font-weight: 600; margin-bottom: 8px; }
        .device-denied-alert-text { font-size: 13px; color: #7f1d1d; line-height: 1.6; }
        .device-denied-btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; background: #dc2626; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .device-denied-footer { font-size: 12px; color: #9ca3af; margin-top: 20px; }

        @media (prefers-color-scheme: dark) {
          .device-denied-card { background: var(--gray-100); }
          .device-denied-alert { background: var(--gray-200); border-color: var(--gray-300); }
          .device-denied-alert-title { color: var(--gray-800); }
          .device-denied-alert-text { color: var(--gray-600); }
          .device-denied-footer { color: var(--gray-500); }
        }
      `}</style>
    </div>
  );
};

export default DeviceAccessDenied;
