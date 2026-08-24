import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { requestBreak, endBreak, getTodayBreaks } from '../api/breaks';
import Toast from '../components/Toast';

// Break area coordinates: 25°14'28.90"N 51°28'31.51"E
const BREAK_AREA_LAT = 25 + 14/60 + 28.90/3600;
const BREAK_AREA_LNG = 51 + 28/60 + 31.51/3600;
const MAX_DISTANCE_METERS = 10;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (deg) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Scan = () => {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showSheet, setShowSheet] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [myActiveBreak, setMyActiveBreak] = useState(null);
  const [myPendingBreak, setMyPendingBreak] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const isOperator = user?.role === 'Operator';

  const checkBreakStatus = useCallback(async () => {
    try {
      const res = await getTodayBreaks();
      const myBreaks = res.data.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
      setMyActiveBreak(myBreaks.find(b => b.status === 'active') || null);
      setMyPendingBreak(myBreaks.find(b => b.status === 'pending') || null);
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => { checkBreakStatus(); }, [checkBreakStatus]);

  const showToast = (message, type) => setToast({ message, type });

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Failed to get location. Please enable GPS.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

  const validateLocation = async () => {
    setLocationLoading(true);
    try {
      const { lat, lng } = await getLocation();
      const distance = getDistanceMeters(lat, lng, BREAK_AREA_LAT, BREAK_AREA_LNG);
      if (distance > MAX_DISTANCE_METERS) {
        showToast(`You are ${Math.round(distance)}m away from the break area. Must be within ${MAX_DISTANCE_METERS}m.`, 'error');
        return null;
      }
      return { lat, lng };
    } catch (err) {
      showToast(err.message || 'Location access denied. Please enable GPS and try again.', 'error');
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const handleBreakAction = async (lat, lng) => {
    setActionLoading(true);
    try {
      if (myActiveBreak) {
        await endBreak(myActiveBreak._id);
        showToast('Break ended successfully!', 'success');
      } else if (isOperator && !myPendingBreak) {
        const res = await getTodayBreaks();
        const myBreaks = res.data.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
        const completed = myBreaks.filter(b => b.status === 'completed' || b.status === 'late');
        await requestBreak(completed.length + 1, 15, 'qr', lat, lng);
        showToast('Break requested! Waiting for supervisor approval.', 'success');
      } else if (!isOperator && !myActiveBreak) {
        showToast('Only Operators can request breaks. Use Dashboard to approve requests.', 'info');
      }
      checkBreakStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setActionLoading(false); }
  };

  const onScanSuccess = async () => {
    stopScanner();
    if (myActiveBreak) {
      await handleBreakAction();
    } else {
      const loc = await validateLocation();
      if (loc) await handleBreakAction(loc.lat, loc.lng);
    }
  };

  const onScanError = () => {};

  const startCameraScanner = () => {
    setShowSheet(false);
    setScanning(true);
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 10 }, false);
      scannerRef.current.render(onScanSuccess, onScanError);
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleFileScan = async (file) => {
    if (!file) return;
    setShowSheet(false);
    setActionLoading(true);
    try {
      const html5QrCode = new Html5Qrcode('file-reader');
      const decodedText = await html5QrCode.scanFile(file, false);
      await html5QrCode.clear();
      if (decodedText) {
        if (myActiveBreak) {
          await handleBreakAction();
        } else {
          const loc = await validateLocation();
          if (loc) await handleBreakAction(loc.lat, loc.lng);
        }
      }
    } catch (err) {
      showToast('Could not read QR code from image. Please try again.', 'error');
    } finally {
      setActionLoading(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerInput = (ref) => {
    setShowSheet(false);
    setTimeout(() => {
      if (ref.current) ref.current.click();
    }, 10);
  };

  useEffect(() => () => {
    if (scannerRef.current) scannerRef.current.clear().catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">QR Code Scanner</h1>
      <p className="page-subtitle">Scan to request or end your break</p>

      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleFileScan(e.target.files[0])} />
      <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileScan(e.target.files[0])} />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileScan(e.target.files[0])} />

      {/* File reader placeholder (needed by Html5Qrcode) */}
      <div id="file-reader" style={{ display: 'none' }}></div>

      <div className="card">
        <div className="card-body" style={{ textAlign: 'center' }}>
          {scanning ? (
            <div>
              <div id="reader" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}></div>
              <button className="btn btn-secondary" onClick={stopScanner} style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}>
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          ) : actionLoading || locationLoading ? (
            <div style={{ padding: 40 }}>
              <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 48, color: 'var(--primary)' }}></i>
              <div style={{ marginTop: 16, fontSize: 14, color: 'var(--gray-600)' }}>
                {locationLoading ? 'Getting your location...' : 'Processing...'}
              </div>
            </div>
          ) : myPendingBreak ? (
            <div style={{ padding: 20, background: 'var(--primary-light)', borderRadius: 12, border: '2px dashed var(--primary)' }}>
              <i className="fas fa-hourglass-half" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}></i>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Break Request Pending</div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>Waiting for supervisor approval...</div>
            </div>
          ) : (
            <>
              <div style={{ width: 120, height: 120, margin: '0 auto 20px', background: 'var(--gray-100)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed var(--gray-300)' }}>
                <i className="fas fa-qrcode" style={{ fontSize: 48, color: 'var(--gray-400)' }}></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>Break Area QR Code</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 24 }}>
                {myActiveBreak
                  ? 'Scan QR to end your break and return to work'
                  : 'Scan QR to request a break (15 min · Up to 4 per shift)'}
              </div>

              {/* Main single button */}
              <button
                className="scan-main-btn"
                onClick={() => setShowSheet(true)}
                disabled={actionLoading}
              >
                <i className="fas fa-qrcode" style={{ fontSize: 28 }}></i>
                <span>Scan QR Code for Break</span>
              </button>

              {/* Location hint */}
              {!myActiveBreak && (
                <div className="location-hint">
                  <div className="location-hint-text">
                    <i className="fas fa-map-marker-alt" style={{ marginRight: 6 }}></i>
                    You must be within 10 meters of the break area to request a break.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compact Action Sheet Popup */}
      {showSheet && (
        <div className="sheet-overlay" onClick={() => setShowSheet(false)}>
          <div className="sheet-popup" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-row" onClick={(e) => { e.preventDefault(); triggerInput(cameraInputRef); }}>
              <i className="fas fa-camera sheet-row-icon"></i>
              <span className="sheet-row-label">Take Photo</span>
            </button>
            <button className="sheet-row" onClick={(e) => { e.preventDefault(); triggerInput(galleryInputRef); }}>
              <i className="fas fa-images sheet-row-icon"></i>
              <span className="sheet-row-label">Photo Library</span>
            </button>
            <button className="sheet-row" onClick={(e) => { e.preventDefault(); triggerInput(fileInputRef); }}>
              <i className="fas fa-folder-open sheet-row-icon"></i>
              <span className="sheet-row-label">Choose File</span>
            </button>
            <button className="sheet-row" onClick={(e) => { e.preventDefault(); triggerInput(fileInputRef); }}>
              <i className="fab fa-google-drive sheet-row-icon"></i>
              <span className="sheet-row-label">Google Drive</span>
            </button>
            <div className="sheet-divider"></div>
            <button className="sheet-row sheet-cancel" onClick={() => setShowSheet(false)}>
              <span className="sheet-row-label">Cancel</span>
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3><i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--primary)' }}></i>How It Works</h3></div>
        <div className="card-body">
          <div className="break-list">
            {[
              { icon: 'fa-paper-plane', title: 'Request Break', desc: 'Operator scans QR to request a break (15 min, max 4 per shift)' },
              { icon: 'fa-user-check', title: 'Supervisor Approval', desc: 'Supervisor/Team Leader/Coordinator reviews and approves' },
              { icon: 'fa-play-circle', title: 'Break Starts', desc: 'Once approved, break timer begins automatically' },
              { icon: 'fa-bell', title: '5-Min Reminder', desc: 'Operator gets notified 5 minutes before break ends' },
              { icon: 'fa-stop-circle', title: 'Return & Scan', desc: 'Operator scans QR again to end break and return to work' }
            ].map((step, i) => (
              <div className="break-item" key={i}>
                <div className="break-number">{i + 1}</div>
                <div className="break-details">
                  <div className="break-title"><i className={`fas ${step.icon}`} style={{ marginRight: 8, color: 'var(--primary)' }}></i>{step.title}</div>
                  <div className="break-time">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
        .card { background: white; border-radius: var(--radius); box-shadow: var(--shadow-sm); border: 1px solid var(--gray-100); overflow: hidden; margin-bottom: 16px; }
        .card-header { padding: 16px 20px; border-bottom: 1px solid var(--gray-100); display: flex; align-items: center; justify-content: space-between; }
        .card-header h3 { font-size: 15px; font-weight: 600; color: var(--gray-800); }
        .card-body { padding: 20px; }
        .scan-main-btn { width: 100%; max-width: 320px; padding: 24px; border: 3px dashed var(--primary); border-radius: var(--radius); background: var(--primary-light); color: var(--primary); font-size: 18px; font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: all 0.2s; font-family: inherit; margin: 0 auto; }
        .scan-main-btn:hover:not(:disabled) { background: #d4e6fc; transform: scale(1.02); }
        .scan-main-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-secondary { background: var(--gray-100); color: var(--gray-700); border: 1px solid var(--gray-200); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .location-hint { margin-top: 16px; padding: 10px; background: var(--success-light); border-radius: 8px; border: 1px solid var(--success-light); }
        .location-hint-text { font-size: 12px; color: var(--success); }

        /* Compact Action Sheet */
        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.15s ease; padding: 20px; }
        .sheet-popup { background: white; border-radius: var(--radius); width: 100%; max-width: 280px; box-shadow: var(--shadow-lg); overflow: hidden; animation: scaleIn 0.2s ease; }
        .sheet-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: none; background: none; cursor: pointer; transition: background 0.15s; font-family: inherit; text-align: left; width: 100%; }
        .sheet-row:hover { background: var(--gray-50); }
        .sheet-row-icon { font-size: 16px; color: var(--gray-500); width: 22px; text-align: center; }
        .sheet-row-label { font-size: 14px; font-weight: 500; color: var(--gray-800); }
        .sheet-divider { height: 1px; background: var(--gray-100); margin: 0 16px; }
        .sheet-cancel { justify-content: center; padding: 12px 16px; }
        .sheet-cancel .sheet-row-label { font-weight: 600; color: var(--gray-500); font-size: 14px; }

        .break-list { display: flex; flex-direction: column; gap: 10px; }
        .break-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--gray-50); border-radius: var(--radius-sm); border: 1px solid var(--gray-100); }
        .break-number { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-200); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--gray-600); flex-shrink: 0; }
        .break-details { flex: 1; }
        .break-title { font-weight: 600; font-size: 14px; color: var(--gray-800); }
        .break-time { font-size: 12px; color: var(--gray-500); margin-top: 2px; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }

        @media (prefers-color-scheme: dark) {
          .page-title { color: var(--gray-900); }
          .page-subtitle { color: var(--gray-500); }
          .card { background: var(--gray-100); border-color: var(--gray-700); }
          .card-header { border-bottom-color: var(--gray-700); }
          .card-header h3 { color: var(--gray-800); }
          .scan-main-btn:hover:not(:disabled) { background: #1e3a5f; }
          .sheet-popup { background: var(--gray-100); }
          .sheet-row:hover { background: var(--gray-200); }
          .sheet-row-label { color: var(--gray-800); }
          .sheet-divider { background: var(--gray-700); }
          .sheet-cancel .sheet-row-label { color: var(--gray-500); }
          .break-item { background: var(--gray-200); border-color: var(--gray-600); }
          .break-title { color: var(--gray-800); }
          .break-time { color: var(--gray-500); }
          .break-number { background: var(--gray-300); color: var(--gray-700); }
          .location-hint-text { color: var(--success); }
        }
        @media (max-width: 480px) {
          .scan-main-btn { padding: 18px; font-size: 16px; }
          .sheet-overlay { align-items: flex-end; padding: 0; }
          .sheet-popup { max-width: 100%; border-radius: var(--radius) var(--radius) 0 0; animation: slideUp 0.25s ease; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
