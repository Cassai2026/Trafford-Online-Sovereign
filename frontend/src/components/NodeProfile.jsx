import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const EMPTY_FORM = { name: '', bio_roi: '', skillInput: '', constraintInput: '' };

export default function NodeProfile() {
  const { user } = useAuth();
  const [node, setNode]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [creating, setCreating] = useState(false);

  const loadNode = useCallback(() => {
    if (!user) return;
    setLoading(true);
    api.get('/nodes/me')
      .then(({ data }) => {
        setNode(data);
        setForm({
          name:            data.name || '',
          bio_roi:         data.bio_roi || '',
          skillInput:      (data.skills || []).join(', '),
          constraintInput: (data.constraints || []).join(', '),
        });
      })
      .catch((e) => {
        if (e.message.includes('404') || e.message.includes('not found')) {
          setNode(null);
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadNode(); }, [loadNode]);

  const parseList = (str) =>
    str.split(',').map((s) => s.trim()).filter(Boolean);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.post('/nodes', {
        name:        form.name,
        bio_roi:     form.bio_roi,
        skills:      parseList(form.skillInput),
        constraints: parseList(form.constraintInput),
      });
      setSuccess('Node created! You are now part of the sovereign network.');
      loadNode();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/nodes/${node.uuid}`, {
        name:        form.name,
        bio_roi:     form.bio_roi,
        skills:      parseList(form.skillInput),
        constraints: parseList(form.constraintInput),
      });
      setSuccess('Profile updated.');
      loadNode();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  if (!user) {
    return (
      <section className="card">
        <h2>👤 My Sovereign Node</h2>
        <p className="muted">Sign in to view and manage your node profile.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="card">
        <h2>👤 My Sovereign Node</h2>
        <p className="muted">Loading your node…</p>
      </section>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>👤 My Sovereign Node</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Your node represents you in the sovereign network. Skills listed here
          feed the auto-match engine on the Job Board.
        </p>

        {node ? (
          <>
            <div className="node-stats">
              <span className="node-stat">
                Reputation: <strong>{Number(node.reputation_score).toFixed(2)}</strong>
              </span>
              <span className="node-stat">
                Skills: <strong>{(node.skills || []).length}</strong>
              </span>
            </div>

            <form className="deed-form" onSubmit={handleUpdate}>
              <input placeholder="Display name *" {...field('name')} required />
              <textarea
                placeholder="Bio-ROI — your personal return-on-investment statement (optional)"
                rows={3}
                {...field('bio_roi')}
              />
              <input
                placeholder="I Can (comma-separated skills, e.g. plumbing, carpentry, IT)"
                {...field('skillInput')}
              />
              <input
                placeholder="I Don't (comma-separated constraints, e.g. heights, chemicals)"
                {...field('constraintInput')}
              />
              <button type="submit" className="action-btn" disabled={saving}>
                {saving ? 'Saving…' : 'Update Profile'}
              </button>
            </form>
          </>
        ) : (
          <form className="deed-form" onSubmit={handleCreate}>
            <p className="muted" style={{ marginBottom: 12 }}>
              No node found for your account — create one to join the sovereign network.
            </p>
            <input placeholder="Display name *" {...field('name')} required />
            <textarea
              placeholder="Bio-ROI — your personal return-on-investment statement (optional)"
              rows={3}
              {...field('bio_roi')}
            />
            <input
              placeholder="I Can (comma-separated skills, e.g. plumbing, carpentry, IT)"
              {...field('skillInput')}
            />
            <input
              placeholder="I Don't (comma-separated constraints, e.g. heights, chemicals)"
              {...field('constraintInput')}
            />
            <button type="submit" className="action-btn" disabled={creating}>
              {creating ? 'Creating…' : 'Create My Node'}
            </button>
          </form>
        )}

        {error   && <p className="error">⚠ {error}</p>}
        {success && <p className="success">✅ {success}</p>}
      </div>
    </div>
  );
}
