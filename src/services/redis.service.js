const { redis } = require('../config/redis');

// ═══════════════════════════════════════════════════════════════════
// SESSIONS — JWT blacklist on logout
// ═══════════════════════════════════════════════════════════════════
const SESSION_PREFIX = 'session:';
const SESSION_BLACKLIST = 'sessions:blacklist';

async function blacklistToken(token, ttlSeconds) {
  try {
    if (redis.status !== 'ready') return;
    await redis.setex(`${SESSION_BLACKLIST}:${token}`, ttlSeconds, '1');
  } catch {}
}

async function isTokenBlacklisted(token) {
  try {
    if (redis.status !== 'ready') return false;
    const exists = await redis.exists(`${SESSION_BLACKLIST}:${token}`);
    return exists === 1;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ONLINE STATUS — Redis-backed presence tracking
// ═══════════════════════════════════════════════════════════════════
const ONLINE_SET = 'users:online';
const ONLINE_PREFIX = 'user:online:';
const TYPING_PREFIX = 'user:typing:';

async function setOnline(userId) {
  try {
    if (redis.status !== 'ready') return;
    await redis.sadd(ONLINE_SET, userId);
    await redis.setex(`${ONLINE_PREFIX}${userId}`, 300, '1');
  } catch {}
}

async function setOffline(userId) {
  try {
    if (redis.status !== 'ready') return;
    await redis.srem(ONLINE_SET, userId);
    await redis.del(`${ONLINE_PREFIX}${userId}`);
  } catch {}
}

async function isOnline(userId) {
  try {
    if (redis.status !== 'ready') return false;
    const exists = await redis.exists(`${ONLINE_PREFIX}${userId}`);
    return exists === 1;
  } catch {
    return false;
  }
}

async function getOnlineUsers() {
  try {
    if (redis.status !== 'ready') return [];
    return await redis.smembers(ONLINE_SET);
  } catch {
    return [];
  }
}

async function refreshOnline(userId) {
  try {
    if (redis.status !== 'ready') return;
    await redis.expire(`${ONLINE_PREFIX}${userId}`, 300);
  } catch {}
}

async function setTyping(conversationId, userId) {
  try {
    if (redis.status !== 'ready') return;
    await redis.setex(`${TYPING_PREFIX}${conversationId}:${userId}`, 5, '1');
  } catch {}
}

async function isTyping(conversationId, userId) {
  try {
    if (redis.status !== 'ready') return false;
    const exists = await redis.exists(`${TYPING_PREFIX}${conversationId}:${userId}`);
    return exists === 1;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TRENDING FEED — Sorted sets for hot content ranking
// ═══════════════════════════════════════════════════════════════════
const TRENDING_POSTS = 'trending:posts';
const TRENDING_MEMORIES = 'trending:memories';
const TRENDING_REELS = 'trending:reels';
const TRENDING_POST_PREFIX = 'trending:post:';
const TRENDING_TTL = 3600;

async function trackPostEngagement(postId, type, score = 1) {
  try {
    if (redis.status !== 'ready') return;

    const key = type === 'memory' ? TRENDING_MEMORIES
      : type === 'reel' ? TRENDING_REELS
      : TRENDING_POSTS;

    await redis.zincrby(key, score, postId);
    await redis.expire(key, TRENDING_TTL);

    await redis.zincrby(`${TRENDING_POST_PREFIX}${type || 'post'}`, score, postId);
    await redis.expire(`${TRENDING_POST_PREFIX}${type || 'post'}`, TRENDING_TTL);
  } catch {}
}

async function getTrendingPostIds(type = 'all', limit = 10) {
  try {
    if (redis.status !== 'ready') return [];

    let key;
    if (type === 'memory') key = TRENDING_MEMORIES;
    else if (type === 'reel') key = TRENDING_REELS;
    else if (type === 'post') key = `${TRENDING_POST_PREFIX}post`;
    else key = TRENDING_POSTS;

    return await redis.zrevrange(key, 0, limit - 1);
  } catch {
    return [];
  }
}

async function getTrendingScore(postId) {
  try {
    if (redis.status !== 'ready') return 0;
    const score = await redis.zscore(TRENDING_POSTS, postId);
    return score ? parseFloat(score) : 0;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS — Queued notification delivery
// ═══════════════════════════════════════════════════════════════════
const NOTIF_QUEUE_PREFIX = 'notifications:queue:';
const NOTIF_COUNT_PREFIX = 'notifications:count:';
const NOTIF_BATCH_TTL = 86400;

async function queueNotification(userId, notification) {
  try {
    if (redis.status !== 'ready') return;

    const key = `${NOTIF_QUEUE_PREFIX}${userId}`;
    await redis.lpush(key, JSON.stringify(notification));
    await redis.ltrim(key, 0, 49);
    await redis.expire(key, NOTIF_BATCH_TTL);

    await redis.incr(`${NOTIF_COUNT_PREFIX}${userId}`);
  } catch {}
}

async function getQueuedNotifications(userId, limit = 20) {
  try {
    if (redis.status !== 'ready') return [];

    const key = `${NOTIF_QUEUE_PREFIX}${userId}`;
    const items = await redis.lrange(key, 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  } catch {
    return [];
  }
}

async function getUnreadNotificationCount(userId) {
  try {
    if (redis.status !== 'ready') return 0;
    const count = await redis.get(`${NOTIF_COUNT_PREFIX}${userId}`);
    return count ? parseInt(count) : 0;
  } catch {
    return 0;
  }
}

async function clearNotificationCount(userId) {
  try {
    if (redis.status !== 'ready') return;
    await redis.del(`${NOTIF_COUNT_PREFIX}${userId}`);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════
// GENERIC CACHE — Used by controllers directly
// ═══════════════════════════════════════════════════════════════════
const CACHE_PREFIX = 'data:';

async function cacheGet(key) {
  try {
    if (redis.status !== 'ready') return null;
    const val = await redis.get(`${CACHE_PREFIX}${key}`);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    if (redis.status !== 'ready') return;
    await redis.setex(`${CACHE_PREFIX}${key}`, ttlSeconds, JSON.stringify(value));
  } catch {}
}

async function cacheDel(key) {
  try {
    if (redis.status !== 'ready') return;
    await redis.del(`${CACHE_PREFIX}${key}`);
  } catch {}
}

async function cacheInvalidatePattern(pattern) {
  try {
    if (redis.status !== 'ready') return;
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
}

module.exports = {
  redis,
  blacklistToken,
  isTokenBlacklisted,
  setOnline,
  setOffline,
  isOnline,
  getOnlineUsers,
  refreshOnline,
  setTyping,
  isTyping,
  trackPostEngagement,
  getTrendingPostIds,
  getTrendingScore,
  queueNotification,
  getQueuedNotifications,
  getUnreadNotificationCount,
  clearNotificationCount,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
};
