const { redis } = require('../config/redis');

const DEFAULT_TTL = 60;

function cacheKey(req) {
  return `cache:${req.method}:${req.originalUrl}`;
}

function cache(ttlSeconds = DEFAULT_TTL) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    try {
      const ready = redis.status === 'ready';
      if (!ready) return next();

      const key = cacheKey(req);
      const cached = await redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        return res.json(data);
      }
    } catch {}

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        const key = cacheKey(req);
        redis.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

function invalidate(pattern) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidatePattern(pattern).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

async function invalidatePattern(pattern) {
  try {
    if (redis.status !== 'ready') return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {}
}

module.exports = { cache, invalidate, invalidatePattern };
