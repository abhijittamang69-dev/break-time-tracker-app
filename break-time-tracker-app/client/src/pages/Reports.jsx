import { useState, useEffect } from 'react';
import { getReports } from '../api/breaks';

const Reports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      setReport(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    if (!report) return;
    const headers = ['Employee', 'Role', 'Shift', 'Breaks Taken', 'Total Time (sec)', 'Status'];
    const rows = report.staffStats.map(s => [
      s.name,
      s.role,
      s.shift,
      s.breaksTaken,
      s.totalTime,
      s.onBreak ? 'On Break' : s.pending ? 'Pending' : s.isLate ? 'Late' : 'OK'
    ]);
    const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `break-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i></div>;
  if (!report) return null;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">Daily break statistics and analytics</p>
      <div className="stats-grid">
        <StatCard icon="fa-clipboard-check" value={report.totalBreaks} label="Completed Breaks" color="blue" />
        <StatCard icon="fa-clock" value={fmtDurShort(report.avgDuration)} label="Avg Duration" color="green" />
        <StatCard icon="fa-hourglass-half" value={report.pendingRequests || 0} label="Pending Requests" color="orange" />
        <StatCard icon="fa-exclamation-triangle" value={report.lateReturns} label="Late Returns" color="red" />
      </div>
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-users" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Staff Break Summary</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-primary" onClick={downloadCSV} style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>
              <i className="fas fa-download"></i> Export CSV
            </button>
            <span className="badge badge-gray">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Shift</th><th>Breaks</th><th>Total Time</th><th>Status</th></tr></thead>
              <tbody>
                {report.staffStats.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong><br/><span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{s.role}</span></td>
                    <td>{s.shift}</td>
                    <td>{s.breaksTaken}</td>
                    <td>{fmtDur(s.totalTime)}</td>
                    <td>
                      {s.onBreak ? <span className="badge badge-orange">On Break</span> :
                       s.pending ? <span className="badge badge-blue">Pending</span> :
                       s.isLate ? <span className="badge badge-warning">Late</span> :
                       <span className="badge badge-success">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h3><i className="fas fa-list-alt" style={{ marginRight: 8, color: 'var(--primary)' }}></i>All Break Records</h3></div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Employee</th><th>Break #</th><th>Status</th><th>Requested</th><th>Started</th><th>End</th><th>Duration</th></tr></thead>
              <tbody>
                {report.allBreaks.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 30 }}>No break records today</td></tr>
                ) : (
                  [...report.allBreaks].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)).map(b => (
                    <tr key={b._id}>
                      <td>{fmtDate(b.date || b.requestedAt)}</td>
                      <td><strong>{b.userName}</strong></td>
                      <td>Break {b.breakNumber}</td>
                      <td>
                        {b.status === 'pending' ? <span className="badge badge-blue">Pending</span> :
                         b.status === 'active' ? <span className="badge badge-orange">Active</span> :
                         b.status === 'completed' ? <span className="badge badge-success">Done</span> :
                         b.status === 'late' ? <span className="badge badge-warning">Late</span> :
                         <span className="badge badge-gray">Rejected</span>}
                      </td>
                      <td>{fmtTime(b.requestedAt)}</td>
                      <td>{b.startTime ? fmtTime(b.startTime) : '-'}</td>
                      <td>{b.endTime ? fmtTime(b.endTime) : b.status === 'active' ? <span className="pulse" style={{ color: 'var(--orange)' }}>In Progress</span> : '-'}</td>
                      <td>{b.endTime ? fmtDur(b.duration) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        .page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: white; border-radius: var(--radius); padding: 16px; border: 1px solid var(--gray-100); box-shadow: var(--shadow-sm); }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 18px; }
        .stat-icon.blue { background: var(--primary-light); color: var(--primary); }
        .stat-icon.green { background: var(--success-light); color: var(--success); }
        .stat-icon.red { background: var(--warning-light); color: var(--warning); }
        .stat-icon.orange { background: var(--orange-light); color: var(--orange); }
        .stat-value { font-size: 22px; font-weight: 800; color: var(--gray-900); line-height: 1; }
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
        .pulse { animation: pulse 2s ease-in-out infinite; }
        .btn { padding: 14px; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
        @media (max-width: 480px) { .stats-grid { gap: 8px; } .stat-card { padding: 12px; } .stat-value { font-size: 18px; } }
      `}</style>
    </div>
  );
};

const StatCard = ({ icon, value, label, color }) => (
  <div className="stat-card"><div className={`stat-icon ${color}`}><i className={`fas ${icon}`}></i></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
);

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
const fmtDur = (s) => {
  if (!s || s < 0) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
};
const fmtDurShort = (s) => {
  if (!s || s < 0) return '0m';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default Reports;
