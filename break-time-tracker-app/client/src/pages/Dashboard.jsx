import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodayBreaks, requestBreak, endBreak, getPendingBreaks, approveBreak, rejectBreak } from '../api/breaks';
import { getUsers } from '../api/users';
import { getSettings } from '../api/settings';
import Toast from '../components/Toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [todayBreaks, setTodayBreaks] = useState([]);
  const [pendingBreaks, setPendingBreaks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [settings, setSettings] = useState({ maxBreakMinutes: 60, maxBreaksPerShift: 3, defaultBreakDuration: 15, reminderMinutesBeforeEnd: 5 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [liveTimer, setLiveTimer] = useState('00:00:00');
  const [reminderShown, setReminderShown] = useState(false);

  const isApprover = ['Supervisor', 'Team Leader', 'Coordinator', 'Admin'].includes(user?.role);
  const isOperator = user?.role === 'Operator';

  const fetchData = useCallback(async () => {
    try {
      const reqs = [getTodayBreaks(), getUsers(), getSettings()];
      if (isApprover) reqs.push(getPendingBreaks());
      const [breaksRes, usersRes, settingsRes, pendingRes] = await Promise.all(reqs);
      setTodayBreaks(breaksRes.data);
      setAllUsers(usersRes.data);
      setSettings(settingsRes.data);
      if (pendingRes) setPendingBreaks(pendingRes.data);
    } catch (err) {
      const msg = err.response?.data?.description || err.response?.data?.message || 'Failed to load data';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [isApprover]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const myBreaks = todayBreaks.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
  const myCompleted = myBreaks.filter(b => b.status === 'completed' || b.status === 'late');
  const myActive = myBreaks.find(b => b.status === 'active');
  const myPending = myBreaks.find(b => b.status === 'pending');

  // Determine current mode and apply mode-specific limits
  const currentMode = myBreaks.length > 0 ? myBreaks[0].mode : null;
  const isQrLocked = currentMode === 'qr';

  const modeMaxBreaks = isQrLocked ? 4 : 3;
  const modeDefaultDuration = isQrLocked ? 60 : 45;
  const modeMaxMinutes = isQrLocked ? 240 : 135; // 4x60 or 3x45

  const myTotalUsed = myCompleted.reduce((sum, b) => sum + (b.duration || 0), 0);
  const remainingMinutes = Math.max(0, modeMaxMinutes - Math.floor(myTotalUsed / 60));
  const usedPercent = Math.min(100, (myTotalUsed / (modeMaxMinutes * 60)) * 100);
  const breaksTaken = myCompleted.length;
  const canRequestBreak = !isQrLocked && breaksTaken < modeMaxBreaks && remainingMinutes > 0 && !myActive && !myPending;

  // Live timer for active break + 5-min reminder
  useEffect(() => {
    if (!myActive || !myActive.startTime || !myActive.approvedDuration) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(myActive.startTime).getTime()) / 1000);
      const totalSeconds = myActive.approvedDuration * 60;
      const remaining = totalSeconds - elapsed;
      setLiveTimer(fmtDur(elapsed));
      // 5-minute reminder
      if (remaining > 0 && remaining <= settings.reminderMinutesBeforeEnd * 60 && !reminderShown) {
        setReminderShown(true);
        showToast(`⚠️ Your break ends in ${settings.reminderMinutesBeforeEnd} minutes! Please return soon.`, 'error');
      }
      if (remaining <= 0 && !reminderShown) {
        setReminderShown(true);
        showToast(`⏰ Your break time is over! Please return to your workstation.`, 'error');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [myActive, settings.reminderMinutesBeforeEnd, reminderShown]);

  // Reset reminder when active break changes
  useEffect(() => { setReminderShown(false); }, [myActive?._id]);

  const showToast = (message, type) => setToast({ message, type });

  const handleRequestBreak = async () => {
    setActionLoading(true);
    try {
      await requestBreak(breaksTaken + 1, modeDefaultDuration, 'manual');
      showToast('Break requested! Waiting for supervisor approval.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to request break', 'error');
    } finally { setActionLoading(false); }
  };

  const handleEndBreak = async () => {
    if (!myActive) return;
    setActionLoading(true);
    try {
      await endBreak(myActive._id);
      showToast('Break ended successfully!', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to end break', 'error');
    } finally { setActionLoading(false); }
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await approveBreak(id, 0); // backend ignores duration, uses mode-fixed value
      showToast('Break approved! Operator can now take their break.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id) => {
    setApprovingId(id);
    try {
      await rejectBreak(id);
      showToast('Break request rejected.', 'success');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const activeBreaks = todayBreaks.filter(b => b.status === 'active');
  const totalStaff = allUsers.length;
  const available = totalStaff - activeBreaks.length;
  const lateBreaks = todayBreaks.filter(b => b.status === 'late');

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i><p style={{ marginTop: 12, color: 'var(--gray-500)' }}>Loading...</p></div>;

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Overview of today's break activity</p>

      <div className="stats-grid">
        <StatCard icon="fa-users" value={totalStaff} label="Total Staff" color="blue" />
        <StatCard icon="fa-user-check" value={available} label="Available" color="green" />
        <StatCard icon="fa-coffee" value={activeBreaks.length} label="On Break" color="orange" />
        <StatCard icon="fa-exclamation-triangle" value={lateBreaks.length} label="Late Returns" color="red" />
      </div>

      {/* Prominent Pending Alert for Approvers */}
      {isApprover && pendingBreaks.length > 0 && (
        <div
          onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          style={{
            background: 'linear-gradient(135deg, #f05252 0%, #e02424 100%)',
            color: 'white',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(240, 82, 82, 0.3)',
            animation: 'pulse 2s infinite',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fas fa-bell" style={{ fontSize: 18 }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {pendingBreaks.length === 1 ? '1 Operator Waiting for Break Approval' : `${pendingBreaks.length} Operators Waiting for Break Approval`}
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                Tap to review and approve requests below
              </div>
            </div>
          </div>
          <i className="fas fa-chevron-down" style={{ fontSize: 16, opacity: 0.8 }}></i>
        </div>
      )}

      {/* My Break Status */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-user-clock" style={{ marginRight: 8, color: 'var(--primary)' }}></i>My Break Status</h3>
          {myActive ? <span className="badge badge-orange"><i className="fas fa-circle" style={{ fontSize: 8 }}></i> On Break</span> :
           myPending ? <span className="badge badge-gray"><i className="fas fa-hourglass-half"></i> Pending Approval</span> :
           <span className="badge badge-success"><i className="fas fa-check"></i> Available</span>}
        </div>
        <div className="card-body">
          {/* Mode indicator banner */}
          {currentMode && (
            <div className={`mode-banner ${currentMode}`}>
              <i className={`fas ${currentMode === 'qr' ? 'fa-qrcode' : 'fa-hand-pointer'}`}></i>
              <div>
                <div className="mode-title">{currentMode === 'qr' ? 'QR Code Mode' : 'Manual Mode'}</div>
                <div className="mode-sub">{currentMode === 'qr' ? '60 min · Up to 4 breaks per shift' : '45 min · Up to 3 breaks per shift'}</div>
              </div>
            </div>
          )}
          {myActive ? (
            <>
              <div className="break-timer">
                <div className="timer-label">Current Break Duration</div>
                <div className="timer-value">{liveTimer}</div>
                <div className="timer-sublabel">Break #{myActive.breakNumber} · Approved for {myActive.approvedDuration} min · Started at {fmtTime(myActive.startTime)}</div>
              </div>
              {myActive.approvedDuration && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--orange-light)', borderRadius: 8, border: '1px solid var(--orange-light)' }}>
                  <div style={{ fontSize: 13, color: 'var(--orange)', fontWeight: 600 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>
                    You have {myActive.approvedDuration} minutes total. Return before time runs out!
                  </div>
                </div>
              )}
              <button className="btn btn-warning" onClick={handleEndBreak} disabled={actionLoading} style={{ marginTop: 10 }}>
                {actionLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-stop-circle"></i>} End Break
              </button>
            </>
          ) : myPending ? (
            <>
              <div style={{ textAlign: 'center', padding: 30 }}>
                <i className="fas fa-hourglass-half" style={{ fontSize: 48, color: 'var(--gray-400)', marginBottom: 16 }}></i>
                <h4 style={{ fontSize: 18, color: 'var(--gray-800)', marginBottom: 8 }}>Break Request Pending</h4>
                <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Your supervisor will review and approve your break request shortly.</p>
                <div style={{ marginTop: 16, padding: 12, background: 'var(--primary-light)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                    <i className="fas fa-clock" style={{ marginRight: 6 }}></i> Requested at {fmtTime(myPending.requestedAt)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Mode lock warning for QR users */}
              {isQrLocked && (
                <div style={{ padding: 14, background: 'var(--warning-light)', borderRadius: 8, border: '1px solid #fbd5d5', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="fas fa-lock" style={{ color: 'var(--warning)' }}></i>
                  <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
                    You are using QR Code mode this shift. Please use the Scan page to request breaks.
                  </span>
                </div>
              )}

              <div className="progress-container">
                <div className="progress-header"><span>Break Time Used</span><span>{fmtDur(myTotalUsed)} / {modeMaxMinutes} min</span></div>
                <div className="progress-bar"><div className={`progress-fill ${usedPercent > 80 ? 'red' : usedPercent > 50 ? 'orange' : 'green'}`} style={{ width: `${usedPercent}%` }}></div></div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <MiniStat value={breaksTaken} label="Breaks Taken" />
                <MiniStat value={remainingMinutes} label="Minutes Left" />
                <MiniStat value={modeMaxBreaks - breaksTaken} label="Breaks Left" />
              </div>
              {canRequestBreak ? (
                <button className="btn btn-success" onClick={handleRequestBreak} disabled={actionLoading}>
                  {actionLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>} Request Break
                </button>
              ) : (
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-circle"></i>
                  {myPending ? ' Your break request is pending approval.' : isQrLocked ? ' You are using QR Code mode this shift.' : remainingMinutes <= 0 ? ' You have used all your break time.' : ' Maximum breaks reached.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pending Approvals - Only for Supervisors/Team Leaders/Coordinators */}
      {isApprover && pendingBreaks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-clipboard-list" style={{ marginRight: 8, color: 'var(--warning)' }}></i>Pending Break Requests</h3>
            <span className="badge badge-warning">{pendingBreaks.length} pending</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Shift</th><th>Break #</th><th>Requested</th><th>Duration</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingBreaks.map(b => {
                  const u = allUsers.find(u => u._id === b.userId || u._id?.toString() === b.userId?.toString());
                  return (
                    <tr key={b._id}>
                      <td><strong>{u?.name || b.userName}</strong><br/><span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{u?.role || b.userRole}</span></td>
                      <td>{b.shift}</td>
                      <td>Break {b.breakNumber}</td>
                      <td>{fmtTime(b.requestedAt)}</td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {b.mode === 'qr' ? '60' : '45'} min
                        </span>
                        <span className={`badge ${b.mode === 'qr' ? 'badge-blue' : 'badge-gray'}`} style={{ marginLeft: 6, fontSize: 10 }}>
                          {b.mode === 'qr' ? 'QR' : 'Manual'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-success" onClick={() => handleApprove(b._id)} disabled={approvingId === b._id} style={{ width: 'auto', padding: '10px 16px', fontSize: 13, marginRight: 6 }}>
                          {approvingId === b._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>} {approvingId === b._id ? '...' : 'Approve'}
                        </button>
                        <button className="btn btn-warning" onClick={() => handleReject(b._id)} disabled={approvingId === b._id} style={{ width: 'auto', padding: '10px 16px', fontSize: 13 }}>
                          {approvingId === b._id ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-times"></i>} {approvingId === b._id ? '...' : 'Reject'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Currently On Break - Visible to ALL users */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-coffee" style={{ marginRight: 8, color: 'var(--orange)' }}></i>Currently On Break</h3>
          <span className="badge badge-orange">{activeBreaks.length} staff</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {activeBreaks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <i className="fas fa-user-check" style={{ fontSize: 32, color: 'var(--gray-300)', marginBottom: 12 }}></i>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)' }}>No one on break right now</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>All staff are available at their workstations</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Break #</th><th>Started</th><th>Duration</th><th>Approved By</th></tr></thead>
              <tbody>
                {activeBreaks.map(b => {
                  const u = allUsers.find(u => u._id === b.userId || u._id?.toString() === b.userId?.toString());
                  const elapsed = Math.floor((Date.now() - new Date(b.startTime).getTime()) / 1000);
                  const totalSec = (b.approvedDuration || 15) * 60;
                  const remaining = totalSec - elapsed;
                  const isOverdue = remaining <= 0;
                  return (
                    <tr key={b._id}>
                      <td><strong>{u?.name || b.userName}</strong><br/><span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{u?.role || b.userRole}</span></td>
                      <td><span className="badge badge-orange">Break {b.breakNumber}</span></td>
                      <td>{fmtTime(b.startTime)}</td>
                      <td><span className={isOverdue ? 'pulse' : ''} style={{ color: isOverdue ? 'var(--warning)' : 'var(--orange)', fontWeight: 600 }}>{fmtDur(elapsed)} / {b.approvedDuration}m</span></td>
                      <td>{b.approvedByName || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>

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
        .card-body { padding: 20px; }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: var(--success-light); color: var(--success); }
        .badge-warning { background: var(--warning-light); color: var(--warning); }
        .badge-orange { background: var(--orange-light); color: var(--orange); }
        .badge-gray { background: var(--gray-100); color: var(--gray-600); }
        .mode-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 14px; }
        .mode-banner.qr { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .mode-banner.manual { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .mode-banner i { font-size: 20px; }
        .mode-title { font-weight: 700; font-size: 14px; }
        .mode-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }
        .break-timer { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; border-radius: var(--radius); padding: 24px; text-align: center; margin-bottom: 20px; }
        .timer-label { font-size: 13px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .timer-value { font-size: 48px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
        .timer-sublabel { font-size: 13px; opacity: 0.7; margin-top: 4px; }
        .progress-container { margin-bottom: 16px; }
        .progress-header { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
        .progress-header span:first-child { font-weight: 600; color: var(--gray-700); }
        .progress-header span:last-child { color: var(--gray-500); }
        .progress-bar { height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .progress-fill.green { background: var(--success); }
        .progress-fill.red { background: var(--warning); }
        .progress-fill.orange { background: var(--orange); }
        .btn { width: 100%; padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-success { background: var(--success); color: white; }
        .btn-success:hover:not(:disabled) { background: #0d8a5e; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-warning:hover:not(:disabled) { background: #d94040; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .alert { padding: 14px 16px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 10px; font-size: 14px; margin-bottom: 16px; }
        .alert-warning { background: var(--warning-light); color: var(--warning); border: 1px solid #fbd5d5; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 500px; }
        .data-table th { text-align: left; padding: 12px 16px; font-weight: 600; color: var(--gray-500); text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; border-bottom: 1px solid var(--gray-200); }
        .data-table td { padding: 12px 16px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); }
        .data-table tr:hover td { background: var(--gray-50); }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @media (max-width: 480px) { .stats-grid { gap: 8px; } .stat-card { padding: 12px; } .stat-value { font-size: 20px; } .timer-value { font-size: 36px; } }
      `}</style>
    </div>
  );
};

const StatCard = ({ icon, value, label, color }) => (
  <div className="stat-card"><div className={`stat-icon ${color}`}><i className={`fas ${icon}`}></i></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
);

const MiniStat = ({ value, label }) => (
  <div style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: 12, background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)' }}>
    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)' }}>{value}</div><div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{label}</div>
  </div>
);

const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDur = (s) => {
  if (!s || s < 0) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
};

export default Dashboard;
