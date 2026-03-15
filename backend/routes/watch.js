const express = require('express');
const store = require('../services/store');
const syncService = require('../services/sync');

const router = express.Router();

// GET /api/watch/status
router.get('/status', (req, res) => {
  const status = store.getWatchStatus(req.user.userId);
  return res.json(status || { connected: false, lastSeen: null, model: null, os: null });
});

// POST /api/watch/connect
// Called when Watch app establishes connection; registers device info
router.post('/connect', (req, res) => {
  const { model, os, batteryLevel, complicationEnabled } = req.body;

  if (!model || !os) {
    return res.status(400).json({ error: 'model and os are required' });
  }

  const status = {
    connected: true,
    lastSeen: new Date().toISOString(),
    model,
    os,
    batteryLevel: typeof batteryLevel === 'number' ? batteryLevel : null,
    complicationEnabled: Boolean(complicationEnabled),
  };

  store.saveWatchStatus(req.user.userId, status);
  syncService.notifyWatchConnected(req.user.userId, status);

  return res.json({ message: 'Watch connected', status });
});

// POST /api/watch/disconnect
router.post('/disconnect', (req, res) => {
  const current = store.getWatchStatus(req.user.userId);
  const status = { ...(current || {}), connected: false, lastSeen: new Date().toISOString() };
  store.saveWatchStatus(req.user.userId, status);
  syncService.notifyWatchDisconnected(req.user.userId);
  return res.json({ message: 'Watch disconnected' });
});

// PATCH /api/watch/heartbeat
// Lightweight keep-alive from Watch
router.patch('/heartbeat', (req, res) => {
  const { batteryLevel } = req.body;
  const current = store.getWatchStatus(req.user.userId) || {};
  const updated = {
    ...current,
    connected: true,
    lastSeen: new Date().toISOString(),
    ...(typeof batteryLevel === 'number' ? { batteryLevel } : {}),
  };
  store.saveWatchStatus(req.user.userId, updated);
  return res.json({ ts: updated.lastSeen });
});

module.exports = router;
