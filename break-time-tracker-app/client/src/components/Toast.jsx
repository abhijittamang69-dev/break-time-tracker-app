import { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle'
  };

  const colors = {
    success: '#0e9f6e',
    error: '#f05252',
    info: '#1a56db'
  };

  return (
    <div style={{
      padding: '14px 20px',
      borderRadius: '8px',
      color: 'white',
      fontSize: '14px',
      fontWeight: 500,
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
      animation: 'slideInRight 0.3s ease-out',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      maxWidth: '360px',
      background: colors[type]
    }}>
      <i className={`fas ${icons[type]}`}></i>
      {message}
    </div>
  );
};

export default Toast;
