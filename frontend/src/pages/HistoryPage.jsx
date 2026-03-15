import React, { useEffect, useState } from 'react';
import { health as healthApi } from '../api/client';

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="mini-bar-track">
      <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

const RING_COLORS = { move: '#FF2D55', exercise: '#A3FF3D', stand: '#1DFFF3' };

export default function HistoryPage() {
  const [days, setDays] = useState(7);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    healthApi.history(days)
      .then((data) => { setHistory(data.history || []); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [days]);

  const maxSteps = Math.max(...history.map((d) => d.steps || 0), 1);
  const maxCalories = Math.max(...history.map((d) => d.activeEnergy || 0), 1);

  return (
    <div className="history-page">
      <header className="page-header">
        <h2>Activity History</h2>
        <div className="range-tabs" role="group" aria-label="Time range">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              className={`range-tab ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
              aria-pressed={days === d}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {loading ? (
        <div className="page-loading"><div className="spinner" /></div>
      ) : (
        <div className="history-table-wrap">
          <table className="history-table" aria-label="Activity history">
            <thead>
              <tr>
                <th>Date</th>
                <th>Move</th>
                <th>Exercise</th>
                <th>Stand</th>
                <th>Steps</th>
                <th>Calories</th>
                <th>Avg HR</th>
              </tr>
            </thead>
            <tbody>
              {history.map((day) => (
                <tr key={day.date}>
                  <td className="date-cell">
                    {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td>
                    <div className="ring-progress-cell">
                      <span>{day.rings?.move?.percent ?? 0}%</span>
                      <MiniBar value={day.rings?.move?.percent ?? 0} max={100} color={RING_COLORS.move} />
                    </div>
                  </td>
                  <td>
                    <div className="ring-progress-cell">
                      <span>{day.rings?.exercise?.percent ?? 0}%</span>
                      <MiniBar value={day.rings?.exercise?.percent ?? 0} max={100} color={RING_COLORS.exercise} />
                    </div>
                  </td>
                  <td>
                    <div className="ring-progress-cell">
                      <span>{day.rings?.stand?.percent ?? 0}%</span>
                      <MiniBar value={day.rings?.stand?.percent ?? 0} max={100} color={RING_COLORS.stand} />
                    </div>
                  </td>
                  <td>
                    <div className="steps-cell">
                      <span>{(day.steps || 0).toLocaleString()}</span>
                      <MiniBar value={day.steps || 0} max={maxSteps} color="#888" />
                    </div>
                  </td>
                  <td>
                    <div className="steps-cell">
                      <span>{day.activeEnergy || 0} kcal</span>
                      <MiniBar value={day.activeEnergy || 0} max={maxCalories} color="#FF9500" />
                    </div>
                  </td>
                  <td>{day.heartRate ? `${Math.round(day.heartRate.avg)} bpm` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {history.length === 0 && (
            <div className="empty-state">No activity data for this period. Sync your Apple Watch to get started.</div>
          )}
        </div>
      )}
    </div>
  );
}
