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
 * Get short device code for ID generation
 * @param {string} type - device type from getDeviceType
 * @returns {string} 'an' | 'ip' | 'pd' | 'mc' | 'pc' | 'un'
 */
function getDeviceCode(type) {
  const map = {
    Android: 'an',
    iPhone: 'ip',
    iPad: 'pd',
    Mac: 'mc',
    PC: 'pc',
  };
  return map[type] || 'un';
}

/**
 * Generate a unique device ID in format: DIV12@<code><number>
 * Example: DIV12@an847, DIV12@ip392, DIV12@pc105
 * @returns {string}
 */
export function generateDeviceId() {
  const type = getDeviceType();
  const code = getDeviceCode(type);
  // Use last 4 digits of timestamp + 2 random digits for uniqueness
  const timePart = Date.now().toString().slice(-4);
  const randPart = Math.floor(Math.random() * 90 + 10);
  return `DIV12@${code}${timePart}${randPart}`;
}

/**
 * Get simple device name (just the type, no browser info)
 * @param {string} ua - user agent string
 * @returns {string} 'Android', 'iPhone', 'PC', etc.
 */
export function getDeviceName(ua = navigator.userAgent) {
  return getDeviceType(ua);
}
