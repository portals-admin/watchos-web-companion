const express = require('express');
const appleSignin = require('apple-signin-auth');
const { v4: uuidv4 } = require('uuid');
const { signAccessToken, signRefreshToken, verifyTokenPayload, verifyToken } = require('../middleware/auth');
const store = require('../services/store');

const router = express.Router();

// POST /api/auth/apple-signin
// Verifies Apple identity token, creates/updates user, issues JWT pair
router.post('/apple-signin', async (req, res) => {
  const { identityToken, authorizationCode, user: appleUser } = req.body;

  if (!identityToken) {
    return res.status(400).json({ error: 'identityToken is required' });
  }

  let applePayload;
  try {
    applePayload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID || 'com.example.watchos-companion',
      ignoreExpiration: process.env.NODE_ENV === 'development',
    });
  } catch (err) {
    return res.status(401).json({ error: 'Apple identity token verification failed', detail: err.message });
  }

  const appleId = applePayload.sub;

  // Find or create user
  let user = store.getUserByAppleId(appleId);
  if (!user) {
    user = {
      id: uuidv4(),
      appleId,
      email: applePayload.email || appleUser?.email || null,
      name: appleUser?.name
        ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
        : null,
      createdAt: new Date().toISOString(),
      emailVerified: applePayload.email_verified === true || applePayload.email_verified === 'true',
    };
    store.saveUser(user);
  }

  const tokenPayload = { userId: user.id, appleId };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken({ ...tokenPayload, type: 'refresh' });

  store.saveRefreshToken(user.id, refreshToken);

  return res.json({
    accessToken,
    refreshToken,
    expiresIn: 86400,
    user: { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified },
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  const payload = verifyTokenPayload(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  if (!store.isRefreshTokenValid(payload.userId, refreshToken)) {
    return res.status(401).json({ error: 'Refresh token has been revoked' });
  }

  const newAccessToken = signAccessToken({ userId: payload.userId, appleId: payload.appleId });
  const newRefreshToken = signRefreshToken({ userId: payload.userId, appleId: payload.appleId, type: 'refresh' });

  store.saveRefreshToken(payload.userId, newRefreshToken);
  store.revokeRefreshToken(payload.userId, refreshToken);

  return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 86400 });
});

// DELETE /api/auth/session  (sign out)
router.delete('/session', verifyToken, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) store.revokeRefreshToken(req.user.userId, refreshToken);
  store.revokeAllRefreshTokens(req.user.userId);
  return res.json({ message: 'Signed out successfully' });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => {
  const user = store.getUserById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified });
});

module.exports = router;
