import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLeaderboard, createShortlist, downloadShortlistExport } from '../api/client';
import FilterBar from '../components/FilterBar';
import { ScoreBar, SeniorityBadge, LoadingCenter, Alert } from '../components/ui';

const PAGE_SIZE = 25;

export default function LeaderboardPage() {
  const { recruiter } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [targetRole, setTargetRole]     = useState(searchParams.get('target_role') || '');
  const [roleInput, setRoleInput]       = useState(searchParams.get('target_role') || '');
  const [candidates, setCandidates]     = useState([]);
  const [total, setTotal]               = useState(0);
  const [offset, setOffset]             = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [selected, setSelected]         = useState(new Set());
  const [successMsg, setSuccessMsg]     = useState('');
  const [exportId, setExportId]         = useState(null);

  const [filters, setFilters] = useState({
    seniority_tier: searchParams.get('seniority_tier') || '',
    company:        searchParams.get('company') || '',
    min_score:      searchParams.get('min_score') || '',
  });

  // Sync filter changes to URL so views are bookmarkable
  function updateFilters(changes) {
    const next = { ...filters, ...changes };
    setFilters(next);
    setOffset(0);
    setSelected(new Set());
    const params = { target_role: targetRole };
    if (next.seniority_tier) params.seniority_tier = next.seniority_tier;
    if (next.company)        params.company        = next.company;
    if (next.min_score)      params.min_score      = next.min_score;
    setSearchParams(params);
  }

  const fetchLeaderboard = useCallback(async () => {
    if (!targetRole) return;
    setLoading(true);
    setError('');
    try {
      const data = await getLeaderboard({
        target_role:   targetRole,
        seniority_tier: filters.seniority_tier || undefined,
        company:        filters.company || undefined,
        min_score:      filters.min_score || undefined,
        limit:  PAGE_SIZE,
        offset,
      });
      setCandidates(data.candidates || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [targetRole, filters, offset]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map(c => c.id)));
    }
  }

  async function handleCreateShortlist() {
    const name = window.prompt('Enter a name for this shortlist:');
    if (!name) return;
    setSuccessMsg('');
    try {
      const orderedIds = candidates
        .filter(c => selected.has(c.id))
        .map(c => c.id);

      const data = await createShortlist({
        recruiter_id:  recruiter.id,
        name,
        target_role:   targetRole,
        candidate_ids: orderedIds,
      });
      setExportId(data.id);
      setSuccessMsg(`✅ Shortlist "${name}" created with ${data.candidate_count} candidates.`);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  // If no target_role, show input form
  if (!targetRole) {
    return (
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Enter a target role to see ranked candidates.</p>
        </div>
        <div className="card" style={{ maxWidth: '480px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="role-input">Target Role</label>
            <input
              id="role-input"
              type="text"
              className="form-input"
              value={roleInput}
              onChange={e => setRoleInput(e.target.value)}
              placeholder="e.g. senior backend engineer"
              onKeyDown={e => e.key === 'Enter' && setTargetRole(roleInput)}
            />
          </div>
          <button
            id="btn-load-leaderboard"
            className="btn btn-primary"
            onClick={() => { setTargetRole(roleInput); setSearchParams({ target_role: roleInput }); }}
            disabled={!roleInput.trim()}
          >
            Load Leaderboard
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="main-content">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">
            Target role: <strong style={{ color: 'var(--accent-light)' }}>{targetRole}</strong>
            {' '}·{' '}{total} candidate{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => { setTargetRole(''); setSearchParams({}); }}>
          Change role
        </button>
      </div>

      {error   && <Alert type="error">{error}</Alert>}
      {successMsg && (
        <Alert type="success">
          {successMsg}{' '}
          {exportId && (
            <button 
              className="btn btn-ghost" 
              style={{ color: 'var(--accent-light)', padding: '0', marginLeft: '0.5rem' }}
              onClick={async () => {
                 try {
                    const csvData = await downloadShortlistExport(exportId, 'csv');
                    const blob = new Blob([csvData], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `shortlist-${exportId}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                 } catch (err) {
                    alert('Export failed: ' + err.message);
                 }
              }}
            >
              ⬇ Download CSV
            </button>
          )}
        </Alert>
      )}

      <FilterBar filters={filters} onChange={updateFilters} />

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4" style={{
          padding: '0.75rem 1rem',
          background: 'var(--accent-dim)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(108,99,255,0.3)',
        }}>
          <span className="text-sm">{selected.size} selected</span>
          <button
            id="btn-create-shortlist"
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
            onClick={handleCreateShortlist}
          >
            📋 Create shortlist
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <LoadingCenter message="Fetching leaderboard…" />
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No candidates found</h3>
          <p className="text-sm">Try adjusting your filters or ingest more profiles.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    id="select-all"
                    onChange={toggleAll}
                    checked={selected.size === candidates.length && candidates.length > 0}
                  />
                </th>
                <th>#</th>
                <th>Name</th>
                <th>Title</th>
                <th>Company</th>
                <th>Tier</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <input
                      type="checkbox"
                      id={`select-${c.id}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                    />
                  </td>
                  <td className="text-muted font-bold" style={{ width: 40 }}>
                    {offset + i + 1}
                  </td>
                  <td>
                    <Link
                      to={`/candidates/${c.id}`}
                      id={`candidate-link-${c.id}`}
                      style={{ fontWeight: 600 }}
                    >
                      {c.full_name || '—'}
                    </Link>
                  </td>
                  <td className="text-secondary text-sm">{c.current_title || '—'}</td>
                  <td className="text-secondary text-sm">{c.current_company || '—'}</td>
                  <td><SeniorityBadge tier={c.seniority_tier} /></td>
                  <td style={{ minWidth: 140 }}>
                    <ScoreBar score={parseFloat(c.composite_score)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <span>Page {currentPage} of {totalPages || 1} · {total} total</span>
            <div className="pagination-controls">
              <button
                id="btn-prev-page"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem' }}
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                ← Previous
              </button>
              <button
                id="btn-next-page"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem' }}
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
