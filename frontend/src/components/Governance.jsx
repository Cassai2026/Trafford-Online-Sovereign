import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

function ScoreBar({ score }) {
  const pct   = Math.min(Math.max(score ?? 0, 0), 100);
  const colour = pct >= 60 ? '#06d6a0' : pct >= 40 ? '#ffd166' : '#ff4444';
  return (
    <div className="pillar-bar-wrap" title={`${pct}/100`}>
      <div className="pillar-bar" style={{ width: `${pct}%`, background: colour }} />
    </div>
  );
}

export default function Governance() {
  const { user } = useAuth();
  const [pillars, setPillars]   = useState([]);
  const [audit, setAudit]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [scores, setScores]     = useState({});  // { pillar_id: score }
  const [notes, setNotes]       = useState({});  // { pillar_id: note }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/governance/pillars'),
      api.get('/governance/audit'),
    ])
      .then(([pillarsRes, auditRes]) => {
        setPillars(pillarsRes.data);
        setAudit(auditRes.data);

        // Pre-fill sliders from existing audit entries
        const existing = {};
        const existingNotes = {};
        (auditRes.data.entries || []).forEach((e) => {
          existing[e.pillar_id]      = e.score;
          existingNotes[e.pillar_id] = e.notes || '';
        });
        setScores(existing);
        setNotes(existingNotes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const scoreArray = pillars.map((p) => ({
        pillar_id: p.id,
        score:     scores[p.id] !== undefined ? Number(scores[p.id]) : 0,
        notes:     notes[p.id] || '',
      }));
      const res = await api.post('/governance/audit', { scores: scoreArray });
      setSuccess(
        res.data.gate_passed
          ? '✅ All 14+1 Pillars Aligned — Sovereign Reflection Gate PASSED.'
          : `⚠ Gate not yet passed: ${res.data.balanced}/15 pillars balanced.`
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <section className="card"><p className="muted">Loading governance data…</p></section>;
  }

  const auditMap = {};
  (audit?.entries || []).forEach((e) => { auditMap[e.pillar_id] = e; });

  return (
    <div>
      <div className="card">
        <h2>⚖️ Governance — 14+1 Pillar Audit</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Score each pillar 0–100 weekly. All 15 must reach ≥60 for the
          Sovereign Reflection Gate to pass.
        </p>

        {audit && (
          <div className={`reflect-gate ${audit.gate_passed ? 'gate-ok' : 'gate-warn'}`} style={{ marginBottom: 20 }}>
            {audit.gate_passed
              ? `✅ Week ${audit.week} — Gate PASSED · All 15 pillars balanced`
              : `⚠ Week ${audit.week} — ${audit.pillars_balanced}/${audit.pillars_audited || 15} pillars balanced · Gate incomplete`}
          </div>
        )}

        {error   && <p className="error">⚠ {error}</p>}
        {success && <p className="success">{success}</p>}

        {user ? (
          <form onSubmit={handleSubmit}>
            <div className="pillar-grid">
              {pillars.map((p) => {
                const val = scores[p.id] !== undefined ? scores[p.id] : (auditMap[p.id]?.score ?? 0);
                return (
                  <div key={p.id} className="pillar-row">
                    <div className="pillar-label">
                      <span className="pillar-num">{p.pillar_number}.</span>
                      <span className="pillar-name">{p.pillar_name}</span>
                      <span className="pillar-score-val">{Math.round(val)}</span>
                    </div>
                    <ScoreBar score={val} />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={val}
                      className="pillar-slider"
                      aria-label={`Score for ${p.pillar_name}`}
                      onChange={(e) => setScores({ ...scores, [p.id]: Number(e.target.value) })}
                    />
                  </div>
                );
              })}
            </div>
            <button type="submit" className="action-btn" style={{ marginTop: 20 }} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Weekly Audit'}
            </button>
          </form>
        ) : (
          <div>
            <div className="pillar-grid">
              {pillars.map((p) => {
                const entry = auditMap[p.id];
                return (
                  <div key={p.id} className="pillar-row">
                    <div className="pillar-label">
                      <span className="pillar-num">{p.pillar_number}.</span>
                      <span className="pillar-name">{p.pillar_name}</span>
                      <span className="pillar-score-val">{entry ? Math.round(entry.score) : '—'}</span>
                    </div>
                    <ScoreBar score={entry?.score ?? 0} />
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ marginTop: 16 }}>Sign in to submit a weekly audit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
