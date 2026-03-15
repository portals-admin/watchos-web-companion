import React from 'react';

const RING_CONFIGS = [
  { key: 'move',     label: 'Move',     color: '#FF2D55', trackColor: '#3A0010', r: 54 },
  { key: 'exercise', label: 'Exercise', color: '#A3FF3D', trackColor: '#1A3800', r: 41 },
  { key: 'stand',    label: 'Stand',    color: '#1DFFF3', trackColor: '#003836', r: 28 },
];

const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const STROKE = 11;

function ringPath(r, percent) {
  const circ = 2 * Math.PI * r;
  const dash = Math.min((percent / 100) * circ, circ * 2); // allow double-ring for >100%
  return { circumference: circ, dashArray: `${dash} ${circ * 2}` };
}

export default function ActivityRings({ rings = {}, size = SIZE, showLabels = true }) {
  const scale = size / SIZE;

  return (
    <div className="activity-rings" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label="Activity rings"
        role="img"
      >
        {RING_CONFIGS.map(({ key, color, trackColor, r }) => {
          const ring = rings[key] || { percent: 0 };
          const { circumference, dashArray } = ringPath(r, ring.percent);

          return (
            <g key={key}>
              {/* Track */}
              <circle
                cx={CX} cy={CY} r={r}
                fill="none"
                stroke={trackColor}
                strokeWidth={STROKE}
              />
              {/* Progress */}
              <circle
                cx={CX} cy={CY} r={r}
                fill="none"
                stroke={color}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={dashArray}
                strokeDashoffset={0}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            </g>
          );
        })}
      </svg>

      {showLabels && (
        <div className="rings-legend">
          {RING_CONFIGS.map(({ key, label, color }) => {
            const ring = rings[key] || { current: 0, goal: 0, percent: 0 };
            return (
              <div key={key} className="ring-legend-item">
                <span className="ring-dot" style={{ background: color }} />
                <span className="ring-label">{label}</span>
                <span className="ring-value">{ring.current}<span className="ring-unit">/{ring.goal}</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
