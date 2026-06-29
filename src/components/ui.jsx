import React from 'react';

export function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  return (
    <div className="score-bar-wrapper">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="score-bar-label">{pct.toFixed(0)}</span>
    </div>
  );
}

export function SeniorityBadge({ tier }) {
  return <span className={`seniority-badge ${tier || 'mid'}`}>{tier || '—'}</span>;
}

export function Spinner({ large }) {
  return <div className={`spinner${large ? ' spinner-lg' : ''}`} aria-label="Loading" />;
}

export function LoadingCenter({ message }) {
  return (
    <div className="loading-center">
      <Spinner large />
      <span>{message || 'Loading…'}</span>
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}
