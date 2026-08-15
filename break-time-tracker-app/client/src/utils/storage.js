// Safe localStorage wrapper for mobile/private-mode browsers
const storage = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail (private mode, quota exceeded, etc.)
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch {
      // Silently fail
    }
  }
};

export default storage;
