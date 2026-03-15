import React, { useEffect, useState } from 'react';
import { watch as watchApi } from '../api/client';
import { useSync } from '../context/SyncContext';

function BatteryIcon({ level }) {
  const pct = level ?? 0;
  const color = pct > 20 ? '#A3FF3D' : '#FF2D55';
  return (
    <span className="battery-icon" aria-label={`Battery ${pct}%`}>
      <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
        <rect x="1" y="1" width="23" height="12" rx="2" stroke="#ccc" strokeWidth="1.5" fill="none" />
        <rect x="25" y="4" width="2" height="6" rx="1" fill="#ccc" />
        <rect x="2" y="2" width={Math.round((pct / 100) * 21)} height="10" rx="1.5" fill={color} />
      </svg>
      <span className="battery-label">{pct}%</span>
    </span>
  );
}

export default function WatchPage() {
  const { watchConnected } = useSync();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    watchApi.status()
      .then(setStatus)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDisconnect() {
    try {
      await watchApi.disconnect();
      setStatus((s) => ({ ...s, connected: false }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const isConnected = watchConnected || status?.connected;

  return (
    <div className="watch-page">
      <header className="page-header">
        <h2>Apple Watch</h2>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="watch-status-card">
        <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-pulse" />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

        {status ? (
          <dl className="watch-details">
            <div className="detail-row">
              <dt>Model</dt>
              <dd>{status.model || '—'}</dd>
            </div>
            <div className="detail-row">
              <dt>watchOS</dt>
              <dd>{status.os || '—'}</dd>
            </div>
            <div className="detail-row">
              <dt>Battery</dt>
              <dd>{status.batteryLevel != null ? <BatteryIcon level={status.batteryLevel} /> : '—'}</dd>
            </div>
            <div className="detail-row">
              <dt>Complication</dt>
              <dd>{status.complicationEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
            <div className="detail-row">
              <dt>Last seen</dt>
              <dd>{status.lastSeen ? new Date(status.lastSeen).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        ) : (
          <p className="empty-state">No watch has connected yet.</p>
        )}

        {isConnected && (
          <button className="btn-danger" onClick={handleDisconnect}>
            Disconnect Watch
          </button>
        )}
      </div>

      <div className="watch-instructions">
        <h3>How to connect</h3>
        <ol>
          <li>Open the Watch Companion app on your iPhone.</li>
          <li>Ensure your Apple Watch is nearby and paired.</li>
          <li>Tap <strong>Connect</strong> in the iPhone app to authorize health data sync.</li>
          <li>Health data will appear here automatically after connection.</li>
        </ol>
      </div>
    </div>
  );
}
