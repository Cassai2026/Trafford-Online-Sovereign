import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function JobBoard() {
  const [swaps, setSwaps]     = useState([]);
  const [form, setForm]       = useState({ skill_needed: '', description: '', location: 'Stretford/Trafford' });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError]     = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/swaps')
      .then(({ data }) => setSwaps(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.skill_needed.trim()) return;
    setPosting(true);
    try {
      await api.post('/swaps', form);
      setForm({ skill_needed: '', description: '', location: 'Stretford/Trafford' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const statusBadge = (s) => {
    const colours = { open: '#ffd166', matched: '#06d6a0', in_progress: '#118ab2', completed: '#aaa', cancelled: '#ff6b6b' };
    return <span style={{ background: colours[s] ?? '#555', color: '#1a1a2e', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{s}</span>;
  };

  return (
    <section className="card">
      <h2>💼 Job Board — Skill Sharing &amp; Labour Swaps</h2>
      <form onSubmit={handleSubmit} className="swap-form">
        <input
          placeholder="Skill needed (e.g. plumbing, carpentry, IT support)"
          value={form.skill_needed}
          onChange={(e) => setForm({ ...form, skill_needed: e.target.value })}
          required
        />
        <input
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          placeholder="Location"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <button type="submit" disabled={posting}>{posting ? 'Posting…' : 'Post Swap Request'}</button>
      </form>
      {error && <p className="error">⚠ {error}</p>}
      {loading ? (
        <p className="muted">Loading swaps…</p>
      ) : swaps.length === 0 ? (
        <p className="muted">No active swap requests. Be the first!</p>
      ) : (
        <ul className="swap-list">
          {swaps.map((s) => (
            <li key={s.uuid} className="swap-item">
              <div>
                <strong>{s.skill_needed}</strong> {statusBadge(s.status)}
              </div>
              <div className="swap-meta">
                {s.requester_name && <span>Requested by: {s.requester_name}</span>}
                {s.provider_name  && <span> → Provider: {s.provider_name}</span>}
                <span className="muted"> | {s.location}</span>
              </div>
              {s.description && <p className="swap-desc">{s.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
