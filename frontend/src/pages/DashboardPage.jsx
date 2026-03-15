import React, { useEffect, useState, useCallback } from 'react';
import { health as healthApi } from '../api/client';
import { useSync } from '../context/SyncContext';
import ActivityRings from '../components/ActivityRings';
import HeartRateCard from '../components/HeartRateCard';
import WatchFace from '../components/WatchFace';

export default function DashboardPage() {
  const { latestSummary, watchConnected } = useSync();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await healthApi.summary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Apply real-time updates from WebSocket
  useEffect(() => {
    if (latestSummary) setSummary(latestSummary);
  }, [latestSummary]);

  const display = summary || {};
  const rings = display.rings || {};

  if (loading) {
    return <div className="page-loading"><div className="spinner" /></div>;
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h2>Today's Activity</h2>
        <span className="page-date">{display.date || new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="dashboard-grid">
        {/* Watch face widget */}
        <div className="grid-item grid-item--watch">
          <WatchFace
            rings={rings}
            heartRate={display.heartRate}
            steps={display.steps}
            watchConnected={watchConnected}
          />
        </div>

        {/* Activity rings detail */}
        <div className="grid-item grid-item--rings">
          <h3 className="card-title">Activity Rings</h3>
          <ActivityRings rings={rings} size={160} showLabels />
        </div>

        {/* Heart rate */}
        <div className="grid-item">
          <HeartRateCard heartRate={display.heartRate} />
        </div>

        {/* Steps */}
        <div className="grid-item">
          <div className="metric-card">
            <div className="metric-header">
              <span aria-hidden>👟</span><span>Steps</span>
            </div>
            <div className="metric-main">
              <span className="metric-value">{(display.steps || 0).toLocaleString()}</span>
            </div>
            <div className="metric-sub">
              <span>{((display.distance || 0).toFixed(2))} km walked</span>
            </div>
          </div>
        </div>

        {/* Calories */}
        <div className="grid-item">
          <div className="metric-card">
            <div className="metric-header"><span aria-hidden>🔥</span><span>Calories</span></div>
            <div className="metric-main">
              <span className="metric-value">{display.activeEnergy || 0}</span>
              <span className="metric-unit">kcal</span>
            </div>
            <div className="metric-sub"><span>Active calories burned</span></div>
          </div>
        </div>

        {/* Exercise */}
        <div className="grid-item">
          <div className="metric-card">
            <div className="metric-header"><span aria-hidden>🏃</span><span>Exercise</span></div>
            <div className="metric-main">
              <span className="metric-value">{display.exerciseMinutes || 0}</span>
              <span className="metric-unit">min</span>
            </div>
            <div className="metric-sub"><span>Goal: 30 min</span></div>
          </div>
        </div>

        {/* Stand */}
        <div className="grid-item">
          <div className="metric-card">
            <div className="metric-header"><span aria-hidden>🧍</span><span>Stand</span></div>
            <div className="metric-main">
              <span className="metric-value">{display.standHours || 0}</span>
              <span className="metric-unit">hrs</span>
            </div>
            <div className="metric-sub"><span>Goal: 12 hrs</span></div>
          </div>
        </div>

        {/* Blood oxygen */}
        {display.bloodOxygen != null && (
          <div className="grid-item">
            <div className="metric-card">
              <div className="metric-header"><span aria-hidden>🩸</span><span>Blood O₂</span></div>
              <div className="metric-main">
                <span className="metric-value">{display.bloodOxygen}</span>
                <span className="metric-unit">%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
