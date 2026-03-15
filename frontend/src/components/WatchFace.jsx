import React from 'react';
import ActivityRings from './ActivityRings';

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function WatchFace({ rings, heartRate, steps, watchConnected }) {
  const now = new Date();

  return (
    <div className="watch-face" aria-label="Watch face display">
      <div className="watch-bezel">
        <div className="watch-screen">
          <div className="watch-time">{formatTime(now)}</div>
          <div className="watch-date">{formatDate(now)}</div>

          <div className="watch-rings">
            <ActivityRings rings={rings} size={110} showLabels={false} />
          </div>

          <div className="watch-metrics">
            {heartRate && (
              <div className="watch-metric">
                <span className="watch-metric-icon" aria-hidden>❤️</span>
                <span className="watch-metric-val">{heartRate.current}</span>
              </div>
            )}
            {steps != null && (
              <div className="watch-metric">
                <span className="watch-metric-icon" aria-hidden>👟</span>
                <span className="watch-metric-val">{steps.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className={`watch-status ${watchConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {watchConnected ? 'Watch Connected' : 'Watch Offline'}
          </div>
        </div>
      </div>
    </div>
  );
}
