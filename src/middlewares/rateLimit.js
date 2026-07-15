const windows = new Map();

const rateLimit = ({ windowMs = 60000, max = 30, message = 'Too many requests' } = {}) => {
  return (req, res, next) => {
    const key = `${req.userId || req.ip}:${req.route?.path || req.path}`;
    const now = Date.now();

    if (!windows.has(key)) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    const entry = windows.get(key);

    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }

    next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows) {
    if (now > entry.resetAt) windows.delete(key);
  }
}, 60000);

module.exports = rateLimit;
