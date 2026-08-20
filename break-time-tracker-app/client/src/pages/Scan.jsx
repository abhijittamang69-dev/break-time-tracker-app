import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { requestBreak, endBreak, getTodayBreaks } from '../api/breaks';
import Toast from '../components/Toast';

const Scan = () => {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [myActiveBreak, setMyActiveBreak] = useState(null);
  const [myPendingBreak, setMyPendingBreak] = useState(null);
  const [myMode, setMyMode] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isOperator = user?.role === 'Operator';
  const isManualLocked = myMode === 'manual';

  const checkBreakStatus = useCallback(async () => {
    try {
      const res = await getTodayBreaks();
      const myBreaks = res.data.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
      setMyActiveBreak(myBreaks.find(b => b.status === 'active') || null);
      setMyPendingBreak(myBreaks.find(b => b.status === 'pending') || null);
      setMyMode(myBreaks.length > 0 ? myBreaks[0].mode : null);
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => { checkBreakStatus(); }, [checkBreakStatus]);

  const startScanner = () => {
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

  const onScanSuccess = async () => {
    stopScanner();
    await handleBreakAction();
  };
  const onScanError = () => {};

  const handleBreakAction = async () => {
    setActionLoading(true);
    try {
      if (myActiveBreak) {
        await endBreak(myActiveBreak._id);
        showToast('Break ended successfully!', 'success');
      } else if (isOperator && !myPendingBreak) {
        const res = await getTodayBreaks();
        const myBreaks = res.data.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
        const completed = myBreaks.filter(b => b.status === 'completed' || b.status === 'late');
        await requestBreak(completed.length + 1, 60, 'qr');
        showToast('Break requested! Waiting for supervisor approval.', 'success');
      } else if (!isOperator && !myActiveBreak) {
        showToast('Only Operators can request breaks. Use Dashboard to approve requests.', 'info');
      }
      checkBreakStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setActionLoading(false); }
  };

  const showToast = (message, type) => setToast({ message, type });
  useEffect(() => () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); }, []);

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">QR Code Scanner</h1>
      <p className="page-subtitle">Scan to request or end your break</p>

      {/* Mode lock warning */}
      {isManualLocked && (
        <div style={{ padding: 16, background: 'var(--warning-light)', borderRadius: 12, border: '2px dashed var(--warning)', marginBottom: 16, textAlign: 'center' }}>
          <i className="fas fa-lock" style={{ fontSize: 24, color: 'var(--warning)', marginBottom: 8 }}></i>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>Manual Mode Active</div>
          <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>You are using Manual mode this shift. QR Code requests are not available.</div>
        </div>
      )}

      <div className="card">
        <div className="card-body" style={{ textAlign: 'center' }}>
          {scanning ? (
            <div>
              <div id="reader" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}></div>
              <button className="btn btn-secondary" onClick={stopScanner} style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}><i className="fas fa-times"></i> Cancel</button>
            </div>
          ) : (
            <>
              <div style={{ width: 200, height: 200, margin: '0 auto 20px', background: 'var(--gray-100)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed var(--gray-300)' }}>
                <i className="fas fa-qrcode" style={{ fontSize: 64, color: 'var(--gray-400)' }}></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>Break Area QR Code</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 20 }}>QR Mode: 15 min · Up to 4 breaks per shift</div>

              {myActiveBreak ? (
                <button className="scan-btn" onClick={startScanner} disabled={actionLoading} style={{ borderColor: 'var(--warning)', background: 'var(--warning-light)', color: 'var(--warning)' }}>
                  <i className="fas fa-stop-circle"></i>
                  <span>End Break</span>
                  <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>Scan QR to return to work</span>
                </button>
              ) : myPendingBreak ? (
                <div style={{ padding: 20, background: 'var(--primary-light)', borderRadius: 12, border: '2px dashed var(--primary)' }}>
                  <i className="fas fa-hourglass-half" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12 }}></i>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>Break Request Pending</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>Waiting for supervisor approval...</div>
                </div>
              ) : isManualLocked ? (
                <div style={{ padding: 20, background: 'var(--gray-100)', borderRadius: 12, border: '2px dashed var(--gray-300)' }}>
                  <i className="fas fa-ban" style={{ fontSize: 32, color: 'var(--gray-400)', marginBottom: 12 }}></i>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 4 }}>QR Not Available</div>
                  <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>You are locked into Manual mode this shift.</div>
                </div>
              ) : (
                <button className="scan-btn" onClick={startScanner} disabled={actionLoading}>
                  <i className="fas fa-paper-plane"></i>
                  <span>{isOperator ? 'Request Break' : 'Scan QR'}</span>
                  <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>{isOperator ? 'Tap to request break approval (15 min)' : 'Supervisors use Dashboard to approve'}</span>
                </button>
              )}

              {/* Manual action button */}
              {myActiveBreak ? (
                <button className="btn btn-warning" onClick={handleBreakAction} disabled={actionLoading} style={{ marginTop: 12 }}>
                  {actionLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-stop-circle"></i> End Break (Manual)</>}
                </button>
              ) : !myPendingBreak && isOperator && !isManualLocked ? (
                <button className="btn btn-success" onClick={handleBreakAction} disabled={actionLoading} style={{ marginTop: 12 }}>
                  {actionLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Request Break (Manual)</>}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
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
        .scan-btn { width: 100%; padding: 20px; border: 3px dashed var(--primary); border-radius: var(--radius); background: var(--primary-light); color: var(--primary); font-size: 16px; font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all 0.2s; font-family: inherit; }
        .scan-btn:hover:not(:disabled) { background: #d4e6fc; transform: scale(1.02); }
        .scan-btn i { font-size: 32px; }
        .scan-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-success { background: var(--success); color: white; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-secondary { background: var(--gray-100); color: var(--gray-700); border: 1px solid var(--gray-200); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .break-list { display: flex; flex-direction: column; gap: 10px; }
        .break-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--gray-50); border-radius: var(--radius-sm); border: 1px solid var(--gray-100); }
        .break-number { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-200); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--gray-600); flex-shrink: 0; }
        .break-details { flex: 1; }
        .break-title { font-weight: 600; font-size: 14px; color: var(--gray-800); }
        .break-time { font-size: 12px; color: var(--gray-500); margin-top: 2px; }
      `}</style>
    </div>
  );
};

export default Scan;
