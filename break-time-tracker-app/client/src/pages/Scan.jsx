import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { requestBreak, endBreak, getTodayBreaks } from '../api/breaks';
import { getSettings } from '../api/settings';
import Toast from '../components/Toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

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

// Component that pans map to user location
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 19);
  }, [center, map]);
  return null;
};

const Scan = () => {
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [myActiveBreak, setMyActiveBreak] = useState(null);
  const [myPendingBreak, setMyPendingBreak] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [settings, setSettings] = useState({ maxBreakMinutes: 60, maxBreaksPerShift: 3, defaultBreakDuration: 15, reminderMinutesBeforeEnd: 5 });
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);

  const isOperator = user?.role === 'Operator';

  const modeMaxBreaks = settings.maxBreaksPerShift || 3;
  const modeDefaultDuration = settings.defaultBreakDuration || 15;
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

  // Auto-track user location for the map
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
      // If we already have location from background tracking, use it instantly
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
        await requestBreak(completed.length + 1, modeDefaultDuration, 'qr', lat, lng);
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
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, etc.)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
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
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => () => {
    if (scannerRef.current) scannerRef.current.clear().catch(() => {});
  }, []);

  const isInRange = distance !== null && distance <= MAX_DISTANCE_METERS;
  const mapCenter = userLocation || [BREAK_AREA_LAT, BREAK_AREA_LNG];

  return (
    <div className="animate-fade-in">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <h1 className="page-title">QR Code Scanner</h1>
      <p className="page-subtitle">Scan to request or end your break</p>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileScan(e.target.files[0])} />
      <div id="file-reader" style={{ display: 'none' }}></div>

      {/* Map Card */}
      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-header">
          <h3><i className="fas fa-map-marked-alt" style={{ marginRight: 8, color: 'var(--primary)' }}></i>Break Area Location</h3>
          {distance !== null && (
            <span className={`badge ${isInRange ? 'badge-success' : 'badge-warning'}`}>
              {isInRange ? <><i className="fas fa-check-circle"></i> In Range</> : <><i className="fas fa-exclamation-circle"></i> {Math.round(distance)}m away</>}
            </span>
          )}
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div style={{ height: 280, width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <MapContainer center={mapCenter} zoom={19} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={userLocation} />
              {/* Break area marker */}
              <Marker position={[BREAK_AREA_LAT, BREAK_AREA_LNG]}>
                <Popup>Break Area</Popup>
              </Marker>
              {/* 10m radius circle */}
              <Circle
                center={[BREAK_AREA_LAT, BREAK_AREA_LNG]}
                radius={MAX_DISTANCE_METERS}
                pathOptions={{ color: isInRange ? '#0e9f6e' : '#f05252', fillColor: isInRange ? '#0e9f6e' : '#f05252', fillOpacity: 0.15, weight: 2 }}
              />
              {/* User location marker */}
              {userLocation && (
                <Marker position={userLocation}>
                  <Popup>Your Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          {distance !== null && (
            <div style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>
              {isInRange ? (
                <span style={{ color: 'var(--success)', fontWeight: 600 }}><i className="fas fa-check-circle"></i> You are within the break area ({Math.round(distance)}m)</span>
              ) : (
                <span style={{ color: 'var(--warning)', fontWeight: 600 }}><i className="fas fa-exclamation-triangle"></i> You are {Math.round(distance)}m away. Move closer to the break area.</span>
              )}
            </div>
          )}
        </div>
      </div>

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
                  : `Scan QR to request a break (${modeDefaultDuration} min · Up to ${modeMaxBreaks} per shift)`}
              </div>

              <button
                className="scan-main-btn"
                onClick={() => { if (fileInputRef.current) fileInputRef.current.click(); }}
                disabled={actionLoading}
              >
                <i className="fas fa-qrcode" style={{ fontSize: 28 }}></i>
                <span>Scan QR Code for Break</span>
              </button>

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

      <div className="card">
        <div className="card-header"><h3><i className="fas fa-info-circle" style={{ marginRight: 8, color: 'var(--primary)' }}></i>How It Works</h3></div>
        <div className="card-body">
          <div className="break-list">
            {[
              { icon: 'fa-paper-plane', title: 'Request Break', desc: `Operator scans QR to request a break (${modeDefaultDuration} min, max ${modeMaxBreaks} per shift)` },
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
