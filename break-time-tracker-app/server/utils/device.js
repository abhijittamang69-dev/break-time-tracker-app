/**
 * Parse user agent string into simple device type
 * @param {string} ua
 * @returns {string} Android | iPhone | iPad | Mac | PC | Unknown
 */
function getDeviceType(ua = '') {
  if (/android/i.test(ua)) return 'Android';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/macintosh|mac os/i.test(ua)) return 'Mac';
  if (/windows|linux|cros/i.test(ua)) return 'PC';
  return 'Unknown';
}

module.exports = { getDeviceType };
