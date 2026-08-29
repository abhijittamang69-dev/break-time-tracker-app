import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestBreak, endBreak, getTodayBreaks } from '../api/breaks';
import { getSettings } from '../api/settings';
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

const DURATION_OPTIONS = [15, 30, 60];

const Scan = () => {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const [myActiveBreak, setMyActiveBreak] = useState(null);
  const [myPendingBreak, setMyPendingBreak] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [settings, setSettings] = useState({ maxBreakMinutes: 60, maxBreaksPerShift: 3, defaultBreakDuration: 15, reminderMinutesBeforeEnd: 5 });
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [showDurationOptions, setShowDurationOptions] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(15);

  const isOperator = user?.role === 'Operator';

  const getMaxBreaksForDuration = (duration) => {
    if (duration === 15) return 4;
    if (duration === 30) return 2;
    if (duration === 60) return 1;
    return 3;
  };

  const maxBreaksForSelected = getMaxBreaksForDuration(selectedDuration);
  const modeMaxMinutes = settings.maxBreakMinutes || 60;

  const checkBreakStatus = useCallback(async () => {
    try {
      const res = await getTodayBreaks();
      const myBreaks = res.data.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
      setMyActiveBreak(myBreaks.find(b => b.status === 'active') || null);
      setMyPendingBreak(myBreaks.find(b => b.status === 'pending') || null);
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => {
    checkBreakStatus();
    getSettings().then(res => setSettings(res.data)).catch(() => {});
  }, [checkBreakStatus]);

  // Auto-track user location
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Get immediate position first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);
        setDistance(getDistanceMeters(lat, lng, BREAK_AREA_LAT, BREAK_AREA_LNG));
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    );

    // Continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);
        setDistance(getDistanceMeters(lat, lng, BREAK_AREA_LAT, BREAK_AREA_LNG));
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const showToast = (message, type) => setToast({ message, type });

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 1) reject(new Error('Location permission denied. Please allow location access in your browser settings.'));
        else if (err.code === 2) reject(new Error('Unable to determine location. Please make sure GPS/Location Services are turned ON.'));
        else reject(new Error('Location request timed out. Please check your GPS settings and try again.'));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  });

  const validateLocation = async () => {
    setLocationLoading(true);
    try {
      let lat, lng;
      if (userLocation) {
        lat = userLocation[0];
        lng = userLocation[1];
      } else {
        const loc = await getLocation();
        lat = loc.lat;
        lng = loc.lng;
        setUserLocation([lat, lng]);
      }
      const dist = getDistanceMeters(lat, lng, BREAK_AREA_LAT, BREAK_AREA_LNG);
      setDistance(dist);
      if (dist > MAX_DISTANCE_METERS) {
        showToast(`You are ${Math.round(dist)}m away from the break area. Must be within ${MAX_DISTANCE_METERS}m.`, 'error');
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

  const handleStartRequest = async () => {
    if (!isOperator) {
      showToast('Only Operators can request breaks.', 'info');
      return;
    }
    if (myPendingBreak) {
      showToast('You already have a pending break request.', 'info');
      return;
    }
    const loc = await validateLocation();
    if (loc) {
      setShowDurationOptions(true);
    }
  };

  const handleConfirmRequest = async () => {
    setActionLoading(true);
    try {
      const res = await getTodayBreaks();
      const myBreaks = res.data.filter(b => b.userId === user?.id || b.userId?._id === user?.id);
      const completed = myBreaks.filter(b => b.status === 'completed' || b.status === 'late');
      if (completed.length >= maxBreaksForSelected) {
        showToast(`You have used all ${maxBreaksForSelected} breaks for ${selectedDuration} min today.`, 'error');
        setActionLoading(false);
        return;
      }
      await requestBreak(completed.length + 1, selectedDuration, userLocation[0], userLocation[1]);
      showToast('Break requested! Waiting for supervisor approval.', 'success');
      setShowDurationOptions(false);
      checkBreakStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setActionLoading(false); }
  };

  const handleEndBreak = async () => {
    if (!myActiveBreak) return;
    const loc = await validateLocation();
    if (!loc) return;
    setActionLoading(true);
    try {
      await endBreak(myActiveBreak._id);
      showToast('Break ended successfully!', 'success');
      checkBreakStatus();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setActionLoading(false); }
  };

  const isInRange = distance !== null && distance <= MAX_DISTANCE_METERS;

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">Break Request</h1>
      <p className="page-subtitle">Request or end your break</p>

      {/* Location Status Card */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-map-marker-alt" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Location Status</h3>
          {distance !== null && (
            <span className={`badge ${isInRange ? 'badge-success' : 'badge-warning'}`}>
              {isInRange ? <><i className="fas fa-check-circle"></i> In Range</> : <><i className="fas fa-exclamation-circle"></i> {Math.round(distance)}m away</>}
            </span>
          )}
        </div>
        <div className="card-body" style={{ textAlign: 'center' }}>
          {distance !== null ? (
            isInRange ? (
              <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>
                <i className="fas fa-check-circle"></i> You are within the break area ({Math.round(distance)}m)
              </div>
            ) : (
              <div style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 14 }}>
                <i className="fas fa-exclamation-triangle"></i> You are {Math.round(distance)}m away. Move closer to the break area.
              </div>
            )
          ) : (
            <div style={{ color: 'var(--gray-500)', fontSize: 13 }}>
              <i className="fas fa-circle-notch fa-spin" style={{ marginRight: 6 }}></i>Detecting your location...
            </div>
          )}
        </div>
      </div>

      {/* Main Action Card */}
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center' }}>
          {actionLoading || locationLoading ? (
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
          ) : myActiveBreak ? (
            <>
              <div style={{ width: 120, height: 120, margin: '0 auto 20px', background: 'var(--success-light)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed var(--success)' }}>
                <i className="fas fa-coffee" style={{ fontSize: 48, color: 'var(--success)' }}></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>On Break</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 24 }}>
                Your break is currently active. Return on time.
              </div>
              <button
                className="btn btn-danger"
                onClick={handleEndBreak}
                disabled={actionLoading || !isInRange}
                style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}
              >
                <i className="fas fa-stop-circle" style={{ fontSize: 20 }}></i>
                <span>End Break</span>
              </button>
              {!isInRange && distance !== null && (
                <div className="location-hint" style={{ background: 'var(--warning-light)', borderColor: 'var(--warning-light)', marginTop: 16 }}>
                  <div className="location-hint-text" style={{ color: 'var(--warning)' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>
                    You must be within 10 meters of the break area to end your break.
                  </div>
                </div>
              )}
            </>
          ) : showDurationOptions ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Choose Break Duration</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 20 }}>
                Select how long you want your break to be
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                {DURATION_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSelectedDuration(mins)}
                    className="duration-chip"
                    style={{
                      padding: '14px 24px',
                      borderRadius: 10,
                      border: selectedDuration === mins ? '2px solid var(--primary)' : '2px solid var(--gray-200)',
                      background: selectedDuration === mins ? 'var(--primary-light)' : 'var(--gray-50)',
                      color: selectedDuration === mins ? 'var(--primary)' : 'var(--gray-600)',
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {mins} min
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDurationOptions(false)}
                  style={{ width: 'auto', padding: '12px 24px' }}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmRequest}
                  disabled={actionLoading}
                  style={{ width: 'auto', padding: '12px 24px', background: 'var(--primary)', color: 'white' }}
                >
                  <i className="fas fa-check"></i> Confirm
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>Request a Break</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 24 }}>
                {`Up to ${maxBreaksForSelected} breaks per shift · Max ${modeMaxMinutes} min each`}
              </div>

              <button
                className="scan-main-btn"
                onClick={handleStartRequest}
                disabled={actionLoading || !isInRange}
              >
                <i className="fas fa-paper-plane" style={{ fontSize: 28 }}></i>
                <span>Request Break</span>
              </button>

              {!isInRange && distance !== null && (
                <div className="location-hint" style={{ background: 'var(--warning-light)', borderColor: 'var(--warning-light)', marginTop: 16 }}>
                  <div className="location-hint-text" style={{ color: 'var(--warning)' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>
                    You must be within 10 meters of the break area to request a break.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3><i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--primary)' }}></i>How It Works</h3></div>
        <div className="card-body">
          <div className="break-list">
            {[
              { icon: 'fa-paper-plane', title: 'Request Break', desc: 'Operator requests a break (15 min = 4x, 30 min = 2x, 60 min = 1x per shift)' },
              { icon: 'fa-user-check', title: 'Supervisor Approval', desc: 'Supervisor/Team Leader/Coordinator reviews and approves' },
              { icon: 'fa-play-circle', title: 'Break Starts', desc: 'Once approved, break timer begins automatically' },
              { icon: 'fa-bell', title: '5-Min Reminder', desc: 'Operator gets notified 5 minutes before break ends' },
              { icon: 'fa-stop-circle', title: 'Return & End', desc: 'Operator ends break to return to work' }
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
        .btn-danger { background: var(--warning); color: white; }
        .btn-danger:hover:not(:disabled) { background: #e02424; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .location-hint { margin-top: 16px; padding: 10px; background: var(--success-light); border-radius: 8px; border: 1px solid var(--success-light); }
        .location-hint-text { font-size: 12px; color: var(--success); }

        .break-list { display: flex; flex-direction: column; gap: 10px; }
        .break-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--gray-50); border-radius: var(--radius-sm); border: 1px solid var(--gray-100); }
        .break-number { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-200); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: var(--gray-600); flex-shrink: 0; }
        .break-details { flex: 1; }
        .break-title { font-weight: 600; font-size: 14px; color: var(--gray-800); }
        .break-time { font-size: 12px; color: var(--gray-500); margin-top: 2px; }

        @media (prefers-color-scheme: dark) {
          .page-title { color: var(--gray-900); }
          .page-subtitle { color: var(--gray-500); }
          .card { background: var(--gray-100); border-color: var(--gray-700); }
          .card-header { border-bottom-color: var(--gray-700); }
          .card-header h3 { color: var(--gray-800); }
          .scan-main-btn { background: var(--primary-light); color: var(--primary); }
          .scan-main-btn:hover:not(:disabled) { background: #1e3a5f; }
          .break-item { background: var(--gray-200); border-color: var(--gray-600); }
          .break-title { color: var(--gray-800); }
          .break-time { color: var(--gray-500); }
          .break-number { background: var(--gray-300); color: var(--gray-700); }
          .location-hint-text { color: var(--success); }
        }
        @media (max-width: 480px) {
          .scan-main-btn { padding: 18px; font-size: 16px; }
        }
      `}</style>
    </div>
  );
};

export default Scan;
