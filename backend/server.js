const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth');
const healthRoutes = require('./routes/health');
const watchRoutes = require('./routes/watch');
const { verifyToken } = require('./middleware/auth');
const syncService = require('./services/sync');

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time sync
const wss = new WebSocketServer({ server, path: '/ws' });

// --- Middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/health', verifyToken, healthRoutes);
app.use('/api/watch', verifyToken, watchRoutes);

// Health check
app.get('/api/ping', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// --- WebSocket ---
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  let userId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'auth': {
        const payload = syncService.authenticateSocket(msg.token);
        if (!payload) {
          ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
          ws.close();
          return;
        }
        userId = payload.userId;
        syncService.registerClient(clientId, userId, ws);
        ws.send(JSON.stringify({ type: 'auth_ok', clientId }));
        break;
      }
      case 'health_update': {
        if (!userId) { ws.send(JSON.stringify({ type: 'error', error: 'Not authenticated' })); return; }
        const result = syncService.handleRealtimeHealthUpdate(userId, msg.data);
        ws.send(JSON.stringify({ type: 'health_ack', accepted: result.accepted, errors: result.errors }));
        break;
      }
      case 'watch_ping': {
        if (!userId) return;
        syncService.updateWatchHeartbeat(userId);
        ws.send(JSON.stringify({ type: 'watch_pong', ts: Date.now() }));
        break;
      }
      default:
        ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${msg.type}` }));
    }
  });

  ws.on('close', () => {
    if (userId) syncService.unregisterClient(clientId, userId);
  });

  ws.on('error', (err) => {
    console.error(`[WS] client=${clientId} error:`, err.message);
  });
});

// --- Error handler ---
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] WebSocket at ws://localhost:${PORT}/ws`);
});
