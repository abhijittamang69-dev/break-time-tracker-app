import { useState, useEffect } from 'react';
import { getMyBreaks } from '../api/breaks';

const History = () => {
  const [breaks, setBreaks] = useState([]);
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBreaks(); }, []);

  const fetchBreaks = async () => {
    try {
      const res = await getMyBreaks();
      setBreaks(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const today = new Date().toDateString();
  const todayBreaks = breaks.filter(b => new Date(b.date).toDateString() === today);
  const pastBreaks = breaks.filter(b => new Date(b.date).toDateString() !== today);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><i className="fas fa-circle-notch fa-spin" style={{ fontSize: 32, color: 'var(--primary)' }}></i></div>;

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Break History</h1>
      <p className="page-subtitle">Your break records</p>
      <div className="tabs">
        <button className={`tab ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
        <button className={`tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>Past Records</button>
      </div>
      {tab === 'today' && (
        todayBreaks.length === 0 ? <EmptyState icon="fa-clipboard-list" title="No breaks today" text="Your break records will appear here." /> :
        <div className="break-list">{todayBreaks.map(b => <BreakItem key={b._id} break={b} />)}</div>
      )}
      {tab === 'past' && (
        pastBreaks.length === 0 ? <EmptyState icon="fa-history" title="No past records" text="Previous break records will appear here." /> :
        <div>
          {Object.entries(groupByDate(pastBreaks)).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, items]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div className="date-header">{fmtDate(date)}</div>
              <div className="break-list">{items.map(b => <BreakItem key={b._id} break={b} />)}</div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .page-title { font-size: 22px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px; }
        .page-subtitle { font-size: 13px; color: var(--gray-500); margin-bottom: 20px; }
        .tabs { display: flex; gap: 4px; background: var(--gray-100); padding: 4px; border-radius: var(--radius-sm); margin-bottom: 20px; }
        .tab { flex: 1; padding: 8px 12px; border: none; background: transparent; border-radius: 6px; font-size: 13px; font-weight: 600; color: var(--gray-500); cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .tab.active { background: white; color: var(--primary); box-shadow: var(--shadow-sm); }
        .date-header { font-size: 12px; font-weight: 600; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5; margin-bottom: 8px; }
        .break-list { display: flex; flex-direction: column; gap: 10px; }
        .break-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--gray-50); border-radius: var(--radius-sm); border: 1px solid var(--gray-100); }
        .break-item.pending { background: var(--primary-light); border-color: var(--primary); }
        .break-item.active { background: #fff7ed; border-color: var(--orange); }
        .break-item.completed { background: var(--success-light); border-color: var(--success); }
        .break-item.late { background: var(--warning-light); border-color: var(--warning); }
        .break-item.rejected { background: var(--gray-100); border-color: var(--gray-300); opacity: 0.7; }
        .break-number { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-200); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--gray-600); flex-shrink: 0; }
        .break-item.pending .break-number { background: var(--primary); color: white; }
        .break-item.active .break-number { background: var(--orange); color: white; }
        .break-item.completed .break-number { background: var(--success); color: white; }
        .break-item.late .break-number { background: var(--warning); color: white; }
        .break-item.rejected .break-number { background: var(--gray-400); color: white; }
        .break-details { flex: 1; }
        .break-title { font-weight: 600; font-size: 14px; color: var(--gray-800); }
        .break-time { font-size: 12px; color: var(--gray-500); margin-top: 2px; }
        .break-duration { font-weight: 700; font-size: 14px; color: var(--gray-700); }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-success { background: var(--success-light); color: var(--success); }
        .badge-warning { background: var(--warning-light); color: var(--warning); }
        .badge-orange { background: var(--orange-light); color: var(--orange); }
        .badge-blue { background: var(--primary-light); color: var(--primary); }
        .badge-gray { background: var(--gray-100); color: var(--gray-600); }
        .empty-state { text-align: center; padding: 40px 20px; }
        .empty-state i { font-size: 48px; color: var(--gray-300); margin-bottom: 16px; }
        .empty-state h4 { font-size: 16px; font-weight: 600; color: var(--gray-700); margin-bottom: 4px; }
        .empty-state p { font-size: 13px; color: var(--gray-500); }

        @media (prefers-color-scheme: dark) {
          .tab.active { background: var(--gray-100); }
          .date-header { color: var(--gray-400); }
          .break-item { background: var(--gray-200); border-color: var(--gray-600); }
          .break-item.pending { background: var(--primary-light); border-color: var(--primary); }
          .break-item.active { background: var(--orange-light); border-color: var(--orange); }
          .break-item.completed { background: var(--success-light); border-color: var(--success); }
          .break-item.late { background: var(--warning-light); border-color: var(--warning); }
          .break-item.rejected { background: var(--gray-200); border-color: var(--gray-600); opacity: 0.7; }
          .break-title { color: var(--gray-200); }
          .break-time { color: var(--gray-400); }
          .break-duration { color: var(--gray-300); }
          .empty-state h4 { color: var(--gray-200); }
          .empty-state p { color: var(--gray-400); }
        }
      `}</style>
    </div>
  );
};

const BreakItem = ({ break: b }) => {
  const statusConfig = {
    pending: { badge: 'badge-blue', label: 'PENDING', text: 'Waiting for approval' },
    active: { badge: 'badge-orange', label: 'ACTIVE', text: 'In progress' },
    completed: { badge: 'badge-success', label: 'DONE', text: 'Completed' },
    late: { badge: 'badge-warning', label: 'LATE', text: 'Late return' },
    rejected: { badge: 'badge-gray', label: 'REJECTED', text: 'Request rejected' }
  };
  const cfg = statusConfig[b.status] || statusConfig.pending;

  return (
    <div className={`break-item ${b.status}`}>
      <div className="break-number">{b.breakNumber}</div>
      <div className="break-details">
        <div className="break-title">
          Break #{b.breakNumber}
          <span className={`badge ${cfg.badge}`} style={{ marginLeft: 6, fontSize: 10 }}>{cfg.label}</span>
        </div>
        <div className="break-time">
          {b.status === 'pending' ? `Requested at ${fmtTime(b.requestedAt)}` :
           b.status === 'rejected' ? `Rejected by ${b.approvedByName || 'Supervisor'} at ${fmtTime(b.approvedAt)}` :
           b.status === 'active' ? `Started at ${fmtTime(b.startTime)} · Approved for ${b.approvedDuration} min` :
           `${fmtTime(b.startTime)} → ${fmtTime(b.endTime)} · Approved for ${b.approvedDuration} min`}
          · {b.shift} Shift
        </div>
        {b.approvedByName && b.status !== 'rejected' && (
          <div className="break-time" style={{ marginTop: 2 }}><i className="fas fa-user-check" style={{ marginRight: 4, color: 'var(--primary)' }}></i>Approved by {b.approvedByName}</div>
        )}
      </div>
      <div className="break-duration">
        {b.status === 'pending' ? <span style={{ color: 'var(--primary)' }}>Waiting...</span> :
         b.status === 'active' ? <span className="pulse" style={{ color: 'var(--orange)' }}>In Progress</span> :
         b.status === 'rejected' ? <span style={{ color: 'var(--gray-500)' }}>—</span> :
         fmtDur(b.duration)}
      </div>
    </div>
  );
};

const EmptyState = ({ icon, title, text }) => (
  <div className="empty-state"><i className={`fas ${icon}`}></i><h4>{title}</h4><p>{text}</p></div>
);

const groupByDate = (breaks) => breaks.reduce((acc, b) => {
  const key = new Date(b.date).toDateString();
  if (!acc[key]) acc[key] = [];
  acc[key].push(b);
  return acc;
}, {});

const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtDur = (s) => {
  if (!s || s < 0) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`;
};

export default History;
