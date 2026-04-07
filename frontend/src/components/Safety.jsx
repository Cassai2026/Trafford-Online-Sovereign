import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const CATEGORIES = ['health', 'safety', 'environment', 'social'];
const SEVERITIES  = ['low', 'medium', 'high', 'critical'];

const SEV_COLOURS = {
  low:      '#06d6a0',
  medium:   '#ffd166',
  high:     '#ef8c3b',
  critical: '#ff4444',
};

const CAT_COLOURS = {
  health:      '#118ab2',
  safety:      '#ef8c3b',
  environment: '#06d6a0',
  social:      '#9b59b6',
};

function Badge({ label, colour }) {
  return (
    <span style={{
      background: colour ?? '#555',
      color: '#fff',
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

const EMPTY_FORM = {
  title: '', description: '', category: 'health',
  severity: 'medium', location: '',
};

export default function Safety() {
  const { user } = useAuth();
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [posting, setPosting]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);
  const [catFilter, setCatFilter] = useState('');

  const load = (cat = catFilter) => {
    setLoading(true);
    const path = cat ? `/safety?category=${cat}` : '/safety';
    api.get(path)
      .then(({ data }) => setReports(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilter = (cat) => {
    setCatFilter(cat);
    load(cat);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/safety', form);
      setSuccess('Safety report submitted. Thank you for keeping the community safe.');
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div>
      <div className="card">
        <h2>🛡 Community Safety Reports</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Report street-level health, safety, environmental, and social concerns.
          Local guardians review and action reports.
        </p>

        {user ? (
          <form className="deed-form" onSubmit={handleSubmit}>
            <input placeholder="Title *" {...field('title')} required />
            <textarea placeholder="Description *" rows={3} {...field('description')} required />
            <div className="form-row">
              <select {...field('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select {...field('severity')}>
                {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <input placeholder="Location (optional)" {...field('location')} />
            <button type="submit" className="action-btn" disabled={posting}>
              {posting ? 'Submitting…' : 'Submit Report'}
            </button>
          </form>
        ) : (
          <p className="muted">Sign in to submit a safety report.</p>
        )}

        {error   && <p className="error">⚠ {error}</p>}
        {success && <p className="success">✅ {success}</p>}
      </div>

      <div className="card">
        <div className="filter-bar">
          <span className="muted">Filter:</span>
          <button className={`filter-btn ${catFilter === '' ? 'active' : ''}`} onClick={() => applyFilter('')}>All</button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`filter-btn ${catFilter === c ? 'active' : ''}`}
              onClick={() => applyFilter(c)}
            >{c}</button>
          ))}
        </div>

        {loading ? (
          <p className="muted">Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className="muted">No open reports{catFilter ? ` for "${catFilter}"` : ''}. Community looks safe! ✅</p>
        ) : (
          <ul className="item-list">
            {reports.map((r) => (
              <li key={r.uuid} className="item-card">
                <div className="item-header">
                  <strong>{r.title}</strong>
                  <Badge label={r.severity}  colour={SEV_COLOURS[r.severity]} />
                  <Badge label={r.category}  colour={CAT_COLOURS[r.category]} />
                </div>
                <div className="item-meta">
                  Status: {r.status}
                  {r.location      && <> · {r.location}</>}
                  {r.reporter_name && <> · Reported by: {r.reporter_name}</>}
                </div>
                <p className="item-desc">{r.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
