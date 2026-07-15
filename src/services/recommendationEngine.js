const { Op, fn, col, literal } = require('sequelize');
const {
  Post, User, School, SchoolHistory, Follow, Like, Comment,
  ContentTag, UserInteraction, UserPreference, RecommendationCache,
} = require('../models');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION — Weights & Thresholds
// Swap these for AI model scores in the future
// ═══════════════════════════════════════════════════════════════════
const WEIGHTS = {
  schoolAffinity: 0.25,
  generationMatch: 0.20,
  friendGraph: 0.25,
  engagementVelocity: 0.15,
  tagSimilarity: 0.10,
  recencyDecay: 0.05,
};

const CACHE_TTL_MINUTES = 30;
const MAX_CANDIDATES = 200;
const DEFAULT_RETURN_LIMIT = 20;

// ═══════════════════════════════════════════════════════════════════
// TAG EXTRACTION — Auto-tag posts from content
// ═══════════════════════════════════════════════════════════════════
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'and', 'but', 'or', 'if', 'while', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'whose', 'about', 'up', 'also', 'like', 'get', 'got',
  'going', 'went', 'come', 'came', 'make', 'made', 'take', 'took',
  'back', 'even', 'still', 'way', 'much', 'well', 'something', 'dont',
]);

function extractTags(content) {
  if (!content) return [];
  const words = content.toLowerCase()
    .replace(/[#@](\w+)/g, '$1')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, weight: Math.min(count / words.length * 3, 1.0) }));
}

// ═══════════════════════════════════════════════════════════════════
// TIME DECAY — Exponential decay for recency
// ═══════════════════════════════════════════════════════════════════
function timeDecay(createdAt, halfLifeHours = 48) {
  const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.pow(0.5, hoursOld / halfLifeHours);
}

// ═══════════════════════════════════════════════════════════════════
// SCORING SIGNALS — Each returns 0.0–1.0
// ═══════════════════════════════════════════════════════════════════

/**
 * School Affinity — Does the post belong to a school the user attended?
 * Future: weight by recency of attendance, graduation year proximity
 */
function scoreSchoolAffinity(post, userSchoolIds) {
  if (!post.schoolId || userSchoolIds.length === 0) return 0;
  return userSchoolIds.includes(post.schoolId) ? 1.0 : 0;
}

/**
 * Generation Match — Same generation as the user?
 * Future: weight by generational distance (e.g. ±1 gen = 0.5)
 */
function scoreGenerationMatch(post, userGeneration) {
  if (!post.generation || !userGeneration) return 0;
  return post.generation === userGeneration ? 1.0 : 0;
}

/**
 * Friend Graph — Is the author someone the user follows?
 * Future: add mutual friends, friend-of-friend proximity
 */
function scoreFriendGraph(post, followingIds) {
  if (!post.userId) return 0;
  if (post.userId === followingIds[followingIds.length - 1]) return 0; // self
  return followingIds.includes(post.userId) ? 1.0 : 0;
}

/**
 * Engagement Velocity — How much engagement does the post have?
 * Normalized against platform averages (or fixed ceiling)
 * Future: use percentile ranking, trending velocity (acceleration)
 */
function scoreEngagementVelocity(post) {
  const totalEngagement = (post.likesCount || 0) + (post.commentsCount || 0) * 2;
  const normalized = Math.min(totalEngagement / 50, 1.0);
  return normalized;
}

/**
 * Tag Similarity — Do the post's tags overlap with user's preferred tags?
 * Future: use embedding cosine similarity from AI model
 */
function scoreTagSimilarity(postTags, userPreferences) {
  if (!postTags || postTags.length === 0 || !userPreferences || userPreferences.length === 0) return 0;

  const userTagSet = new Set(userPreferences.map((p) => p.preferenceKey));
  const overlap = postTags.filter((t) => userTagSet.has(t.tag));
  if (overlap.length === 0) return 0;

  const matchRatio = overlap.length / postTags.length;
  return Math.min(matchRatio * 1.5, 1.0);
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════════
function computeScore(post, context) {
  const signals = {
    schoolAffinity: scoreSchoolAffinity(post, context.userSchoolIds),
    generationMatch: scoreGenerationMatch(post, context.userGeneration),
    friendGraph: scoreFriendGraph(post, context.followingIds),
    engagementVelocity: scoreEngagementVelocity(post),
    tagSimilarity: scoreTagSimilarity(post.tags, context.userTagPreferences),
    recencyDecay: timeDecay(post.createdAt),
  };

  let totalScore = 0;
  let totalWeight = 0;
  for (const [signal, value] of Object.entries(signals)) {
    totalScore += value * (WEIGHTS[signal] || 0);
    totalWeight += WEIGHTS[signal] || 0;
  }

  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  let reason = '';
  const maxSignal = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
  if (maxSignal) {
    const reasonMap = {
      schoolAffinity: 'From your school',
      generationMatch: `Generation ${post.generation}`,
      friendGraph: 'From someone you follow',
      engagementVelocity: 'Trending now',
      tagSimilarity: 'Matches your interests',
      recencyDecay: 'Recently posted',
    };
    reason = reasonMap[maxSignal[0]] || '';
  }

  return { score: normalizedScore, signals, reason };
}

// ═══════════════════════════════════════════════════════════════════
// USER CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════
async function buildUserContext(userId) {
  const [user, following, tagPreferences] = await Promise.all([
    User.findByPk(userId),
    Follow.findAll({ where: { followerId: userId }, attributes: ['followingId'] }),
    UserPreference.findAll({
      where: { userId, preferenceType: 'tag' },
      order: [['affinity', 'DESC']],
      limit: 50,
    }),
  ]);

  const userSchools = await user.getSchools().catch(() => []);

  const followingIds = [...following.map((f) => f.followingId), userId];
  const userSchoolIds = userSchools.map((s) => s.id);

  return {
    userId,
    userGeneration: user?.generation,
    followingIds,
    userSchoolIds,
    userTagPreferences: tagPreferences,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CANDIDATE FETCHING
// ═══════════════════════════════════════════════════════════════════
async function fetchCandidates(context, excludePostIds = []) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const where = {
    createdAt: { [Op.gte]: thirtyDaysAgo },
    userId: { [Op.ne]: context.userId },
  };

  if (excludePostIds.length > 0) {
    where.id = { [Op.notIn]: excludePostIds };
  }

  const posts = await Post.findAll({
    where,
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      { model: School, as: 'school', attributes: ['id', 'name'] },
      { model: ContentTag, as: 'tags', attributes: ['tag', 'weight', 'source'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: MAX_CANDIDATES,
  });

  return posts;
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RECOMMENDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════
async function getRecommendations(userId, { limit = DEFAULT_RETURN_LIMIT, page = 1, forceRefresh = false } = {}) {
  // 1. Check cache first (unless forced)
  if (!forceRefresh) {
    const cached = await RecommendationCache.findAll({
      where: { userId, expiresAt: { [Op.gt]: new Date() } },
      include: [
        {
          model: Post, as: 'post',
          include: [
            { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
            { model: School, as: 'school', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['score', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    if (cached.length >= limit) {
      return cached.map((c) => ({
        ...c.post.toJSON(),
        _recommendation: { score: c.score, reason: c.reason, signals: c.signals },
      }));
    }
  }

  // 2. Build user context
  const context = await buildUserContext(userId);

  // 3. Fetch candidate posts
  const candidates = await fetchCandidates(context);

  // 4. Score each candidate
  const scored = candidates.map((post) => {
    const postJson = post.toJSON();
    postJson.tags = postJson.tags || [];
    const { score, signals, reason } = computeScore(postJson, context);
    return { post: postJson, score, signals, reason };
  });

  // 5. Sort by score, deduplicate
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit * 2);

  // 6. Update cache
  if (!forceRefresh) {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);
    const bulkData = top.map((item) => ({
      userId,
      postId: item.post.id,
      score: item.score,
      signals: item.signals,
      reason: item.reason,
      expiresAt,
    }));

    await RecommendationCache.bulkCreate(bulkData, {
      updateOnDuplicate: ['score', 'signals', 'reason', 'expiresAt', 'updatedAt'],
    }).catch(() => {});
  }

  // 7. Return paginated results
  const offset = (page - 1) * limit;
  const paginated = top.slice(offset, offset + limit);

  return paginated.map((item) => ({
    ...item.post,
    _recommendation: { score: item.score, reason: item.reason, signals: item.signals },
  }));
}

// ═══════════════════════════════════════════════════════════════════
// TAG EXTRACTION — Auto-tag posts after creation
// ═══════════════════════════════════════════════════════════════════
async function autoTagPost(postId, content) {
  const tags = extractTags(content);
  if (tags.length === 0) return;

  const bulkData = tags.map((t) => ({
    postId,
    tag: t.tag,
    source: 'auto',
    weight: t.weight,
  }));

  await ContentTag.bulkCreate(bulkData, { ignoreDuplicates: true }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════
// INTERACTION TRACKING — Record user behavior for future scoring
// ═══════════════════════════════════════════════════════════════════
async function trackInteraction(userId, postId, interactionType, metadata = {}) {
  await UserInteraction.create({
    userId,
    postId,
    interactionType,
    metadata,
  }).catch(() => {});

  // Update user preferences asynchronously
  updatePreferencesFromInteraction(userId, postId, interactionType).catch(() => {});
}

async function updatePreferencesFromInteraction(userId, postId, interactionType) {
  const interactionWeight = {
    like: 1.0,
    comment: 1.5,
    save: 2.0,
    share: 2.5,
    view: 0.1,
    click: 0.3,
  };

  const weight = interactionWeight[interactionType] || 0.5;

  const post = await Post.findByPk(postId, {
    include: [{ model: ContentTag, as: 'tags', attributes: ['tag'] }],
  });
  if (!post) return;

  // Update tag preferences
  for (const tagRecord of (post.tags || [])) {
    await UserPreference.upsert({
      userId,
      preferenceType: 'tag',
      preferenceKey: tagRecord.tag,
      affinity: weight,
      lastUpdated: new Date(),
    }).catch(() => {});
  }

  // Update author preference
  if (post.userId && post.userId !== userId) {
    await UserPreference.upsert({
      userId,
      preferenceType: 'author',
      preferenceKey: post.userId,
      affinity: weight,
      lastUpdated: new Date(),
    }).catch(() => {});
  }

  // Update content type preference
  if (post.type) {
    await UserPreference.upsert({
      userId,
      preferenceType: 'content_type',
      preferenceKey: post.type,
      affinity: weight,
      lastUpdated: new Date(),
    }).catch(() => {});
  }

  // Update school preference
  if (post.schoolId) {
    await UserPreference.upsert({
      userId,
      preferenceType: 'school',
      preferenceKey: post.schoolId,
      affinity: weight,
      lastUpdated: new Date(),
    }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════════
// SIMILAR POSTS — Find posts similar to a given post
// ═══════════════════════════════════════════════════════════════════
async function getSimilarPosts(postId, limit = 10) {
  const post = await Post.findByPk(postId, {
    include: [{ model: ContentTag, as: 'tags', attributes: ['tag'] }],
  });
  if (!post) return [];

  const tags = post.tags?.map((t) => t.tag) || [];
  if (tags.length === 0) return [];

  const tagMatches = await ContentTag.findAll({
    where: { tag: { [Op.in]: tags }, postId: { [Op.ne]: postId } },
    attributes: ['postId', [fn('COUNT', col('id')), 'matchCount']],
    group: ['postId'],
    order: [[literal('matchCount'), 'DESC']],
    limit,
  });

  const matchIds = tagMatches.map((m) => m.postId);
  if (matchIds.length === 0) return [];

  const posts = await Post.findAll({
    where: { id: { [Op.in]: matchIds } },
    include: [
      { model: User, as: 'author', attributes: ['id', 'fullName', 'username', 'profilePhoto'] },
      { model: School, as: 'school', attributes: ['id', 'name'] },
    ],
  });

  return posts;
}

// ═══════════════════════════════════════════════════════════════════
// RECOMMENDATION STATS — For debugging / admin dashboard
// ═══════════════════════════════════════════════════════════════════
async function getRecommendationStats(userId) {
  const [cacheCount, interactionCount, preferenceCount, tagCount] = await Promise.all([
    RecommendationCache.count({ where: { userId } }),
    UserInteraction.count({ where: { userId } }),
    UserPreference.count({ where: { userId } }),
    UserPreference.count({ where: { userId, preferenceType: 'tag' } }),
  ]);

  const topPreferences = await UserPreference.findAll({
    where: { userId },
    order: [['affinity', 'DESC']],
    limit: 10,
  });

  return { cacheCount, interactionCount, preferenceCount, tagCount, topPreferences };
}

module.exports = {
  getRecommendations,
  getSimilarPosts,
  trackInteraction,
  autoTagPost,
  getRecommendationStats,
  extractTags,
  computeScore,
  buildUserContext,
  WEIGHTS,
};
