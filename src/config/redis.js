const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.warn('Redis not available — running without cache');
  } else {
    console.error('Redis error:', err.message);
  }
});

redis.on('connect', () => {
  console.log('Redis connected');
});

const redisReady = redis.connect().then(() => true).catch(() => false);

module.exports = { redis, redisReady };
