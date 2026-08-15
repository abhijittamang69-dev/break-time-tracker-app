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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <i className="fas fa-ban" style={{ fontSize: '36px', color: 'white' }}></i>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#dc2626',
          marginBottom: '12px',
          letterSpacing: '-0.5px'
        }}>
          Access Restricted
        </h1>

        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#991b1b',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            {errorType === 'DEVICE_DEACTIVATED' ? 'Device Deactivated' : 'Unregistered Device'}
          </p>
          <p style={{
            fontSize: '13px',
            color: '#7f1d1d',
            lineHeight: 1.6
          }}>
            {errorDesc || 'This device is not registered or has been deactivated. Please contact your supervisor or administrator to gain access.'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#dc2626',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            Return to Login
          </button>
        </div>

        <p style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginTop: '20px'
        }}>
          Break Time Tracker App - Device Security
        </p>
      </div>
    </div>
  );
};

export default DeviceAccessDenied;
