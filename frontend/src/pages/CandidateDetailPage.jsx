import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCandidate } from '../api/client';
import { ScoreBar, SeniorityBadge, LoadingCenter, Alert } from '../components/ui';

function formatDate(dateStr) {
  if (!dateStr) return 'Present';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export default function CandidateDetailPage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCandidate(id);
        setCandidate(data);
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingCenter message="Loading candidate profile…" />;
  if (error)   return <div className="main-content"><Alert type="error">{error}</Alert></div>;
  if (!candidate) return null;

  const score = candidate.latest_score;

  return (
    <div className="main-content">
      {/* Back link */}
      <Link to="/leaderboard" className="text-sm text-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}>
        ← Back to Leaderboard
      </Link>

      {/* Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {candidate.full_name || '—'}
            </h1>
            {candidate.headline && (
              <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{candidate.headline}</p>
            )}
            <p className="text-muted text-sm" style={{ marginTop: '0.25rem' }}>
              {[candidate.current_title, candidate.current_company].filter(Boolean).join(' @ ')}
              {candidate.location && ` · ${candidate.location}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {score && <SeniorityBadge tier={score.seniority_tier} />}
            {candidate.linkedin_url && (
              <a
                href={candidate.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                id="btn-linkedin"
                style={{ fontSize: '0.8rem' }}
              >
                🔗 LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      {score && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="text-sm font-bold text-secondary" style={{ marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Score Breakdown — {score.target_role}
          </h2>
          <div className="score-grid">
            <div className="score-card">
              <div className="score-card-label">Composite Score</div>
              <div className="score-card-value">{parseFloat(score.composite_score).toFixed(1)}</div>
            </div>
            <div className="score-card">
              <div className="score-card-label">Experience Velocity</div>
              <div className="score-card-value">{parseFloat(score.experience_velocity_score).toFixed(1)}</div>
            </div>
            <div className="score-card">
              <div className="score-card-label">Keyword Frequency</div>
              <div className="score-card-value">{parseFloat(score.keyword_frequency_score).toFixed(1)}</div>
            </div>
            <div className="score-card">
              <div className="score-card-label">Promotion Trajectory</div>
              <div className="score-card-value">{parseFloat(score.promotion_trajectory_score).toFixed(1)}</div>
            </div>
          </div>

          {/* Score bars */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Composite',            val: score.composite_score },
              { label: 'Experience Velocity',   val: score.experience_velocity_score },
              { label: 'Keyword Frequency',     val: score.keyword_frequency_score },
              { label: 'Promotion Trajectory',  val: score.promotion_trajectory_score },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-secondary mb-1">
                  <span>{label}</span>
                </div>
                <ScoreBar score={parseFloat(val)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience timeline */}
      <div className="card">
        <h2 className="text-sm font-bold text-secondary" style={{ marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Experience Timeline
        </h2>
        {(!candidate.experience || candidate.experience.length === 0) ? (
          <p className="text-muted text-sm">No experience data available.</p>
        ) : (
          <div className="experience-timeline">
            {candidate.experience.map((exp, i) => (
              <div className="exp-item" key={i}>
                <div className="exp-dot" />
                <div className="exp-content">
                  <div className="exp-title">{exp.title || '—'}</div>
                  <div className="exp-company">{exp.company_name || '—'}</div>
                  <div className="exp-dates">
                    {formatDate(exp.start_date)} — {formatDate(exp.end_date)}
                  </div>
                  {exp.description && (
                    <div className="exp-desc">{exp.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
