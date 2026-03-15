/**
 * Real-time sync service — manages WebSocket clients and pushes updates.
 */
const { verifyTokenPayload } = require('../middleware/auth');
const healthkitService = require('./healthkit');
const store = require('./store');

// clientId -> { ws, userId }
const clients = new Map();
// userId -> Set<clientId>
const userClients = new Map();
// userId -> lastHeartbeatTs
const watchHeartbeats = new Map();

function registerClient(clientId, userId, ws) {
  clients.set(clientId, { ws, userId });
  if (!userClients.has(userId)) userClients.set(userId, new Set());
  userClients.get(userId).add(clientId);
}

function unregisterClient(clientId, userId) {
  clients.delete(clientId);
  if (userClients.has(userId)) {
    userClients.get(userId).delete(clientId);
    if (userClients.get(userId).size === 0) userClients.delete(userId);
  }
}

function authenticateSocket(token) {
  if (!token) return null;
  return verifyTokenPayload(token);
}

function broadcast(userId, message) {
  const ids = userClients.get(userId);
  if (!ids) return;
  const payload = JSON.stringify(message);
  for (const clientId of ids) {
    const client = clients.get(clientId);
    if (client && client.ws.readyState === 1 /* OPEN */) {
      try { client.ws.send(payload); } catch { /* ignore */ }
    }
  }
}

function handleRealtimeHealthUpdate(userId, data) {
  if (!data || typeof data !== 'object') {
    return { accepted: false, errors: ['data must be an object'] };
  }
  const result = healthkitService.handleRealtimeUpdate(userId, data);
  if (result.accepted) {
    // Broadcast updated summary to all connected clients for this user
    const summary = healthkitService.buildDailySummary(userId, new Date());
    broadcast(userId, { type: 'summary_update', summary });
  }
  return result;
}

function updateWatchHeartbeat(userId) {
  watchHeartbeats.set(userId, Date.now());
  const current = store.getWatchStatus(userId) || {};
  store.saveWatchStatus(userId, { ...current, connected: true, lastSeen: new Date().toISOString() });
}

function notifyWatchConnected(userId, status) {
  broadcast(userId, { type: 'watch_connected', status });
}

function notifyWatchDisconnected(userId) {
  broadcast(userId, { type: 'watch_disconnected', ts: new Date().toISOString() });
}

function getConnectedClientCount(userId) {
  return userClients.get(userId)?.size || 0;
}

module.exports = {
  registerClient,
  unregisterClient,
  authenticateSocket,
  broadcast,
  handleRealtimeHealthUpdate,
  updateWatchHeartbeat,
  notifyWatchConnected,
  notifyWatchDisconnected,
  getConnectedClientCount,
};
