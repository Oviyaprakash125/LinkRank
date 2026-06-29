import React, { useCallback } from 'react';

const SENIORITY_OPTIONS = ['', 'junior', 'mid', 'senior', 'lead', 'executive'];

/**
 * FilterBar subcomponent for the leaderboard.
 * All state is controlled by the parent (LeaderboardPage).
 */
export default function FilterBar({ filters, onChange }) {
  const { seniority_tier, company, min_score } = filters;

  // Debounce helper for company input
  const debounceRef = React.useRef(null);
  const handleCompany = useCallback((val) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ company: val });
    }, 400);
  }, [onChange]);

  return (
    <div className="filter-bar" role="search" aria-label="Leaderboard filters">
      <div className="form-group">
        <label className="form-label" htmlFor="filter-tier">Seniority</label>
        <select
          id="filter-tier"
          className="form-select"
          value={seniority_tier}
          onChange={e => onChange({ seniority_tier: e.target.value })}
        >
          <option value="">All tiers</option>
          {SENIORITY_OPTIONS.filter(Boolean).map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="filter-company">Company</label>
        <input
          id="filter-company"
          type="text"
          className="form-input"
          defaultValue={company}
          onChange={e => handleCompany(e.target.value)}
          placeholder="Filter by company…"
        />
      </div>

      <div className="form-group" style={{ maxWidth: '120px' }}>
        <label className="form-label" htmlFor="filter-min-score">Min Score</label>
        <input
          id="filter-min-score"
          type="number"
          className="form-input"
          value={min_score}
          onChange={e => onChange({ min_score: e.target.value })}
          placeholder="0"
          min="0"
          max="100"
        />
      </div>
    </div>
  );
}
