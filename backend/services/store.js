/**
 * In-memory store with Map-based persistence.
 * In production, replace this with a proper database (PostgreSQL, Redis, etc.)
 */

// userId -> user object
const users = new Map();
// appleId -> userId
const appleIdIndex = new Map();
// userId -> Set<refreshToken>
const refreshTokens = new Map();
// userId -> { type -> Sample[] }
const healthData = new Map();
// userId -> WatchStatus
const watchStatuses = new Map();

// --- Users ---

function saveUser(user) {
  users.set(user.id, user);
  if (user.appleId) appleIdIndex.set(user.appleId, user.id);
}

function getUserById(id) {
  return users.get(id) || null;
}

function getUserByAppleId(appleId) {
  const id = appleIdIndex.get(appleId);
  return id ? users.get(id) || null : null;
}

// --- Refresh tokens ---

function saveRefreshToken(userId, token) {
  if (!refreshTokens.has(userId)) refreshTokens.set(userId, new Set());
  refreshTokens.get(userId).add(token);
}

function isRefreshTokenValid(userId, token) {
  return refreshTokens.has(userId) && refreshTokens.get(userId).has(token);
}

function revokeRefreshToken(userId, token) {
  if (refreshTokens.has(userId)) refreshTokens.get(userId).delete(token);
}

function revokeAllRefreshTokens(userId) {
  refreshTokens.set(userId, new Set());
}

// --- Health data ---

function saveHealthSamples(userId, samples) {
  if (!healthData.has(userId)) healthData.set(userId, new Map());
  const userData = healthData.get(userId);

  for (const sample of samples) {
    if (!userData.has(sample.type)) userData.set(sample.type, []);
    userData.get(sample.type).push(sample);
  }
}

function getHealthSamples(userId, type, fromDate, toDate, limit = 500) {
  const userData = healthData.get(userId);
  if (!userData) return [];
  const typeSamples = userData.get(type) || [];

  return typeSamples
    .filter((s) => {
      const t = new Date(s.startDate);
      return t >= fromDate && t <= toDate;
    })
    .slice(-limit);
}

// --- Watch status ---

function saveWatchStatus(userId, status) {
  watchStatuses.set(userId, status);
}

function getWatchStatus(userId) {
  return watchStatuses.get(userId) || null;
}

module.exports = {
  saveUser, getUserById, getUserByAppleId,
  saveRefreshToken, isRefreshTokenValid, revokeRefreshToken, revokeAllRefreshTokens,
  saveHealthSamples, getHealthSamples,
  saveWatchStatus, getWatchStatus,
};
