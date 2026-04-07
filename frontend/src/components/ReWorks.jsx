import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const BUILD_STAGES = ['design', 'materials', 'build', 'complete'];

const STAGE_COLOURS = {
  design:    '#ffd166',
  materials: '#118ab2',
  build:     '#ef8c3b',
  complete:  '#06d6a0',
};

function StageBadge({ stage }) {
  return (
    <span style={{
      background: STAGE_COLOURS[stage] ?? '#4a4a6a',
      color: stage === 'design' ? '#1a1a2e' : '#fff',
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {stage || 'unknown'}
    </span>
  );
}

const EMPTY_INV_FORM = {
  item_name: '', source: 'biffa', category: '', quantity: '',
  unit: 'units', container_id: '', build_stage: '', notes: '',
};

export default function ReWorks() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [pollution, setPollution] = useState([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [loadingPol, setLoadingPol] = useState(true);
  const [form, setForm]     = useState(EMPTY_INV_FORM);
  const [posting, setPosting] = useState(false);
  const [error, setError]   = useState(null);
  const [success, setSuccess] = useState(null);

  const loadInventory = () => {
    setLoadingInv(true);
    api.get('/reworks')
      .then(({ data }) => setInventory(data))
      .catch(() => setInventory([]))
      .finally(() => setLoadingInv(false));
  };

  const loadPollution = () => {
    setLoadingPol(true);
    api.get('/reworks/pollution')
      .then(({ data }) => setPollution(data))
      .catch(() => setPollution([]))
      .finally(() => setLoadingPol(false));
  };

  useEffect(() => {
    loadInventory();
    loadPollution();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/reworks', {
        ...form,
        quantity: form.quantity ? Number(form.quantity) : 0,
      });
      setSuccess('Item added to Re-Works inventory.');
      setForm(EMPTY_INV_FORM);
      loadInventory();
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
        <h2>♻️ Re-Works — Upcycled Inventory</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Track Biffa-upcycled items, container build progress, and circular-economy stock.
        </p>

        {user ? (
          <form className="deed-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <input placeholder="Item name *" {...field('item_name')} required />
              <select {...field('source')}>
                {['biffa', 'donation', 'salvage', 'purchase'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-row">
              <input placeholder="Category (optional)" {...field('category')} />
              <input type="number" placeholder="Qty" min={0} {...field('quantity')} />
              <input placeholder="Unit" {...field('unit')} />
            </div>
            <div className="form-row">
              <input placeholder="Container ID (optional)" {...field('container_id')} />
              <select {...field('build_stage')}>
                <option value="">— build stage —</option>
                {BUILD_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <textarea placeholder="Notes (optional)" rows={2} {...field('notes')} />
            <button type="submit" className="action-btn" disabled={posting}>
              {posting ? 'Adding…' : 'Add to Inventory'}
            </button>
          </form>
        ) : (
          <p className="muted">Sign in to add inventory items.</p>
        )}

        {error   && <p className="error">⚠ {error}</p>}
        {success && <p className="success">✅ {success}</p>}

        {loadingInv ? (
          <p className="muted">Loading inventory…</p>
        ) : inventory.length === 0 ? (
          <p className="muted">No inventory items yet.</p>
        ) : (
          <ul className="item-list">
            {inventory.map((item) => (
              <li key={item.uuid} className="item-card">
                <div className="item-header">
                  <strong>{item.item_name}</strong>
                  {item.build_stage && <StageBadge stage={item.build_stage} />}
                  <span className="item-type-badge">{item.source}</span>
                </div>
                <div className="item-meta">
                  Qty: {item.quantity} {item.unit}
                  {item.container_id && <> · Container: {item.container_id}</>}
                  {item.category && <> · {item.category}</>}
                  {item.transport_co2_kg && (
                    <> · CO₂: {Number(item.transport_co2_kg).toFixed(2)} kg</>
                  )}
                </div>
                {item.notes && <p className="item-desc">{item.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>🏭 Transport Pollution Log</h2>
        {loadingPol ? (
          <p className="muted">Loading pollution data…</p>
        ) : pollution.length === 0 ? (
          <p className="muted">No pollution readings recorded yet.</p>
        ) : (
          <div className="pollution-table-wrap">
            <table className="pollution-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Location</th>
                  <th>NO₂ µg/m³</th>
                  <th>PM2.5</th>
                  <th>CO₂ ppm</th>
                  <th>Eco %</th>
                </tr>
              </thead>
              <tbody>
                {pollution.slice(0, 20).map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.recorded_at).toLocaleDateString('en-GB')}</td>
                    <td>{r.location || '—'}</td>
                    <td>{r.no2_ug_m3 ?? '—'}</td>
                    <td>{r.pm25_ug_m3 ?? '—'}</td>
                    <td>{r.co2_ppm ?? '—'}</td>
                    <td>{r.eco_progress_pct != null ? `${r.eco_progress_pct}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
