const BASE = '/api';

function getTokens() {
  const raw = localStorage.getItem('auth');
  return raw ? JSON.parse(raw) : null;
}

function saveTokens(tokens) {
  localStorage.setItem('auth', JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem('auth');
}

async function request(path, options = {}, retry = true) {
  const tokens = getTokens();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (tokens?.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Attempt token refresh on 401
  if (res.status === 401 && retry && tokens?.refreshToken) {
    const refreshed = await refreshTokens(tokens.refreshToken);
    if (refreshed) return request(path, options, false);
    clearTokens();
    window.location.href = '/auth';
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status, body });
  }

  return res.json();
}

async function refreshTokens(refreshToken) {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data);
    return true;
  } catch {
    return false;
  }
}

// --- Auth ---
const auth = {
  appleSignIn: (body) => request('/auth/apple-signin', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  signOut: (refreshToken) =>
    request('/auth/session', { method: 'DELETE', body: JSON.stringify({ refreshToken }) }),
};

// --- Health ---
const health = {
  sync: (samples) => request('/health/sync', { method: 'POST', body: JSON.stringify({ samples }) }),
  data: (type, params = {}) => {
    const qs = new URLSearchParams({ type, ...params }).toString();
    return request(`/health/data?${qs}`);
  },
  summary: (date) => {
    const qs = date ? `?date=${date}` : '';
    return request(`/health/summary${qs}`);
  },
  history: (days = 7) => request(`/health/history?days=${days}`),
};

// --- Watch ---
const watch = {
  status: () => request('/watch/status'),
  connect: (body) => request('/watch/connect', { method: 'POST', body: JSON.stringify(body) }),
  disconnect: () => request('/watch/disconnect', { method: 'POST' }),
  heartbeat: (batteryLevel) =>
    request('/watch/heartbeat', { method: 'PATCH', body: JSON.stringify({ batteryLevel }) }),
};

export { getTokens, saveTokens, clearTokens, auth, health, watch };
