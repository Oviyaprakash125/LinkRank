import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ingestCandidates } from '../api/client';
import { Alert, Spinner } from '../components/ui';

export default function IngestPage() {
  const { tier } = useAuth();
  const navigate  = useNavigate();

  const [urlsText, setUrlsText]           = useState('');
  const [titleKeywords, setTitleKeywords] = useState('');
  const [skillKeywords, setSkillKeywords] = useState('');
  const [minYears, setMinYears]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [pending, setPending]             = useState([]);
  const [result, setResult]               = useState(null);

  const canIngest = tier === 'tier_2' || tier === 'tier_3';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending([]);
    setResult(null);

    const urls = urlsText
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError('Please enter at least one LinkedIn URL.');
      return;
    }

    const tkArr = titleKeywords.split(',').map(t => t.trim()).filter(Boolean);
    const skArr = skillKeywords.split(',').map(s => s.trim()).filter(Boolean);

    if (tkArr.length === 0) {
      setError('Please enter at least one title keyword.');
      return;
    }

    const targetRole = {
      title_keywords:      tkArr,
      skill_keywords:      skArr,
      min_years_experience: minYears ? parseFloat(minYears) : 0,
    };

    setLoading(true);
    try {
      const data = await ingestCandidates({ linkedin_urls: urls, target_role: targetRole });
      setResult(data);
      if (data.pending_enrichment?.length) setPending(data.pending_enrichment);
      if (data.succeeded?.length > 0) {
        // Navigate to leaderboard with the target role
        setTimeout(() => {
          navigate(`/leaderboard?target_role=${encodeURIComponent(tkArr.join(', '))}`);
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ingest failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1 className="page-title">Source Candidates</h1>
        <p className="page-subtitle">Paste LinkedIn URLs and define your target role to score candidates automatically.</p>
      </div>

      {!canIngest && (
        <Alert type="warning">
          ⚠️ Sourcing new candidates requires <strong>Tier 2 (Recruiter)</strong> or above. Your current tier is <strong>{tier}</strong>. Contact your admin for access.
        </Alert>
      )}

      {error && <Alert type="error">{error}</Alert>}
      {result && result.succeeded?.length > 0 && (
        <Alert type="success">
          ✅ {result.succeeded.length} candidate(s) scored successfully! Redirecting to leaderboard…
        </Alert>
      )}

      <form onSubmit={handleSubmit} id="ingest-form">
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            LinkedIn URLs
          </h2>
          <div className="form-group">
            <label className="form-label" htmlFor="urls-input">One URL per line</label>
            <textarea
              id="urls-input"
              className="form-textarea"
              value={urlsText}
              onChange={e => setUrlsText(e.target.value)}
              placeholder={'https://linkedin.com/in/johndoe\nhttps://linkedin.com/in/janedoe'}
              rows={6}
              disabled={!canIngest}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Target Role Definition
          </h2>
          <div className="ingest-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="title-keywords">Title Keywords (comma-separated)</label>
              <input
                id="title-keywords"
                type="text"
                className="form-input"
                value={titleKeywords}
                onChange={e => setTitleKeywords(e.target.value)}
                placeholder="senior backend engineer, staff engineer"
                disabled={!canIngest}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="skill-keywords">Skill Keywords (comma-separated)</label>
              <input
                id="skill-keywords"
                type="text"
                className="form-input"
                value={skillKeywords}
                onChange={e => setSkillKeywords(e.target.value)}
                placeholder="node.js, kafka, distributed systems"
                disabled={!canIngest}
              />
            </div>
          </div>
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <label className="form-label" htmlFor="min-years">Min. Years Experience</label>
            <input
              id="min-years"
              type="number"
              className="form-input"
              value={minYears}
              onChange={e => setMinYears(e.target.value)}
              placeholder="3"
              min="0"
              step="0.5"
              disabled={!canIngest}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canIngest ? (
            <button
              type="submit"
              id="btn-run-sourcing"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? <><Spinner /> Sourcing…</> : '🚀 Run Sourcing'}
            </button>
          ) : (
            <div className="tooltip-wrapper">
              <button className="btn btn-primary" disabled>
                🚀 Run Sourcing
              </button>
              <div className="tooltip">Tier 2+ required to trigger ingestion</div>
            </div>
          )}
        </div>
      </form>

      {pending.length > 0 && (
        <div className="card mt-4">
          <Alert type="warning">
            ⏳ {pending.length} profile(s) are pending enrichment — Crustdata will process them in 30–60 minutes. Come back and re-ingest to score them.
          </Alert>
          <ul className="pending-list">
            {pending.map((url, i) => <li key={i}>{url}</li>)}
          </ul>
        </div>
      )}

      {result?.failed?.length > 0 && (
        <div className="card mt-4">
          <Alert type="error">
            ❌ {result.failed.length} URL(s) failed to process:
          </Alert>
          <ul className="pending-list">
            {result.failed.map((f, i) => <li key={i}>{f.url} — {f.reason}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
