/**
 * Parse navigator.userAgent into a simple device type
 * @param {string} ua - user agent string (defaults to navigator.userAgent)
 * @returns {string} 'Android' | 'iPhone' | 'iPad' | 'Mac' | 'PC' | 'Unknown'
 */
export function getDeviceType(ua = navigator.userAgent) {
  if (/android/i.test(ua)) return 'Android';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  if (/windows|linux|cros/i.test(ua)) return 'PC';
  return 'Unknown';
}

/**
 * Generate a stable unique device ID
 * Uses crypto.randomUUID when available, falls back to a hashed random string
 * @returns {string} unique device ID like 'dvc_a1b2c3d4e5f6...'
 */
export function generateDeviceId() {
  // Prefer crypto.randomUUID (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'dvc_' + crypto.randomUUID().replace(/-/g, '');
  }

  // Fallback: random + timestamp hash-like string
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  const extra = Math.random().toString(36).substring(2, 6);
  return 'dvc_' + rand + time + extra;
}

/**
 * Get a clean device display name
 * @param {string} ua - user agent string
 * @returns {string} e.g. "Android · Chrome", "iPhone · Safari"
 */
export function getDeviceName(ua = navigator.userAgent) {
  const type = getDeviceType(ua);

  // Try to extract browser name
  let browser = '';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return browser ? `${type} · ${browser}` : type;
}
