import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const STATUSES = ['pending', 'in_progress', 'transferred', 'contested'];
const ASSET_TYPES = ['land', 'building', 'equipment', 'fund'];

const STATUS_COLOURS = {
  pending:     '#ffd166',
  in_progress: '#118ab2',
  transferred: '#06d6a0',
  contested:   '#ff6b6b',
};

function StatusBadge({ status }) {
  return (
    <span style={{
      background: STATUS_COLOURS[status] ?? '#555',
      color: '#1a1a2e',
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  asset_name: '', asset_type: 'land', current_holder: '',
  beneficiary: '', liability_value: '', liability_currency: 'GBP',
  asset_description: '', notes: '',
};

export default function Deeds() {
  const { user } = useAuth();
  const [deeds, setDeeds]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [posting, setPosting]   = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/deeds')
      .then(({ data }) => setDeeds(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.asset_name.trim() || !form.current_holder.trim()) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/deeds', {
        ...form,
        liability_value: form.liability_value ? Number(form.liability_value) : 0,
      });
      setSuccess('Deed registered successfully.');
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  };

  const updateStatus = async (uuid, transfer_status) => {
    setError(null);
    try {
      await api.patch(`/deeds/${uuid}/status`, { transfer_status });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div>
      <div className="card">
        <h2>📜 Deed of Sovereign Transfer</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          Register land, buildings, equipment, and funds as sovereign assets — tracking
          liabilities held by ECP / Trafford Council and establishing NGO autonomy.
        </p>

        {user ? (
          <form className="deed-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <input placeholder="Asset name *" {...field('asset_name')} required />
              <select {...field('asset_type')}>
                {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <input placeholder="Current holder (e.g. Trafford Council) *" {...field('current_holder')} required />
            <input placeholder="Beneficiary (e.g. Lilieth NGO)" {...field('beneficiary')} />
            <div className="form-row">
              <input type="number" placeholder="Liability value" {...field('liability_value')} />
              <input placeholder="Currency (GBP)" maxLength={3} style={{ width: 80 }} {...field('liability_currency')} />
            </div>
            <textarea placeholder="Description (optional)" rows={2} {...field('asset_description')} />
            <textarea placeholder="Notes (optional)" rows={2} {...field('notes')} />
            <button type="submit" className="action-btn" disabled={posting}>
              {posting ? 'Registering…' : 'Register Deed'}
            </button>
          </form>
        ) : (
          <p className="muted">Sign in to register a deed.</p>
        )}

        {error   && <p className="error">⚠ {error}</p>}
        {success && <p className="success">✅ {success}</p>}
      </div>

      <div className="card">
        <h2>All Deeds</h2>
        {loading ? (
          <p className="muted">Loading deeds…</p>
        ) : deeds.length === 0 ? (
          <p className="muted">No deeds registered yet.</p>
        ) : (
          <ul className="item-list">
            {deeds.map((d) => (
              <li key={d.uuid} className="item-card">
                <div className="item-header">
                  <strong>{d.asset_name}</strong>
                  <StatusBadge status={d.transfer_status} />
                  <span className="item-type-badge">{d.asset_type}</span>
                </div>
                <div className="item-meta">
                  Holder: {d.current_holder}
                  {d.beneficiary && <> · Beneficiary: {d.beneficiary}</>}
                  {d.liability_value > 0 && (
                    <> · Liability: {Number(d.liability_value).toLocaleString('en-GB')} {d.liability_currency}</>
                  )}
                  {d.created_by_name && <> · By: {d.created_by_name}</>}
                </div>
                {d.asset_description && <p className="item-desc">{d.asset_description}</p>}
                {user && (
                  <div className="status-actions">
                    {STATUSES.filter((s) => s !== d.transfer_status).map((s) => (
                      <button
                        key={s}
                        className="status-btn"
                        onClick={() => updateStatus(d.uuid, s)}
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
