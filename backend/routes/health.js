const express = require('express');
const healthkitService = require('../services/healthkit');
const store = require('../services/store');

const router = express.Router();

// POST /api/health/sync
// Bulk-upload HealthKit samples from the Watch/iPhone
router.post('/sync', (req, res) => {
  const { samples } = req.body;
  if (!Array.isArray(samples) || samples.length === 0) {
    return res.status(400).json({ error: 'samples must be a non-empty array' });
  }
  if (samples.length > 5000) {
    return res.status(413).json({ error: 'Maximum 5000 samples per sync request' });
  }

  const result = healthkitService.parsAndValidateSamples(samples);

  if (result.valid.length > 0) {
    store.saveHealthSamples(req.user.userId, result.valid);
  }

  return res.json({
    accepted: result.valid.length,
    rejected: result.invalid.length,
    errors: result.errors,
  });
});

// GET /api/health/data
// Returns raw samples for a given type and time range
router.get('/data', (req, res) => {
  const { type, from, to, limit = '500' } = req.query;

  if (!type) return res.status(400).json({ error: 'type query param is required' });
  if (!healthkitService.SUPPORTED_TYPES.includes(type)) {
    return res.status(400).json({ error: `Unsupported type. Valid: ${healthkitService.SUPPORTED_TYPES.join(', ')}` });
  }

  const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const toDate = to ? new Date(to) : new Date();

  if (isNaN(fromDate) || isNaN(toDate)) {
    return res.status(400).json({ error: 'Invalid from/to date format (use ISO 8601)' });
  }

  const samples = store.getHealthSamples(req.user.userId, type, fromDate, toDate, parseInt(limit, 10));
  return res.json({ type, from: fromDate.toISOString(), to: toDate.toISOString(), count: samples.length, samples });
});

// GET /api/health/summary
// Aggregated daily summary (activity rings, totals, averages)
router.get('/summary', (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  if (isNaN(targetDate)) return res.status(400).json({ error: 'Invalid date format' });

  const summary = healthkitService.buildDailySummary(req.user.userId, targetDate);
  return res.json(summary);
});

// GET /api/health/history
// Multi-day summary for charts
router.get('/history', (req, res) => {
  const { days = '7' } = req.query;
  const numDays = Math.min(parseInt(days, 10) || 7, 90);
  const history = healthkitService.buildHistory(req.user.userId, numDays);
  return res.json({ days: numDays, history });
});

module.exports = router;
