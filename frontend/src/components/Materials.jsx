import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const CATEGORIES = ['timber', 'metal', 'appliance', 'textile', 'other'];
const CONDITIONS  = ['new', 'good', 'fair', 'poor'];

const CATEGORY_COLOURS = {
  timber:    '#a0522d',
  metal:     '#708090',
  appliance: '#118ab2',
  textile:   '#9b59b6',
  other:     '#4a4a6a',
};

function CategoryBadge({ category }) {
  return (
    <span style={{
      background: CATEGORY_COLOURS[category] ?? '#4a4a6a',
      color: '#fff',
      borderRadius: 4,
      padding: '2px 8px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {category}
    </span>
  );
}

const EMPTY_FORM = {
  name: '', category: 'timber', description: '',
  quantity: '', unit: 'units', condition: 'good', location: '',
};

export default function Materials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [form, setForm]           = useState(EMPTY_FORM);
  const [posting, setPosting]     = useState(false);
  const [error, setError]         = useState(null);
  const [success, setSuccess]     = useState(null);
  const [qrCode, setQrCode]       = useState(null);

  const load = useCallback((cat) => {
    setLoading(true);
    const resolvedCat = cat !== undefined ? cat : filter;
    const path = resolvedCat ? `/materials?category=${resolvedCat}` : '/materials';
    api.get(path)
      .then(({ data }) => setMaterials(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const applyFilter = (cat) => {
    setFilter(cat);
    load(cat);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
    setQrCode(null);
    try {
      const res = await api.post('/materials', {
        ...form,
        quantity: form.quantity ? Number(form.quantity) : 1,
      });
      setSuccess(`"${res.data.name}" listed successfully.`);
      if (res.data.qr_code) setQrCode(res.data.qr_code);
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
        <h2>🔩 Materials Exchange — Re-Works</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          List and browse upcycled materials: timber, metal, appliances and more.
          Each listing generates a QR code for physical tagging.
        </p>

        {user ? (
          <form className="deed-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <input placeholder="Item name *" {...field('name')} required />
              <select {...field('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <textarea placeholder="Description (optional)" rows={2} {...field('description')} />
            <div className="form-row">
              <input type="number" placeholder="Quantity" min={0} {...field('quantity')} />
              <input placeholder="Unit (e.g. kg, m, units)" {...field('unit')} />
              <select {...field('condition')}>
                {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <input placeholder="Location (optional)" {...field('location')} />
            <button type="submit" className="action-btn" disabled={posting}>
              {posting ? 'Listing…' : 'List Material'}
            </button>
          </form>
        ) : (
          <p className="muted">Sign in to list a material.</p>
        )}

        {error   && <p className="error">⚠ {error}</p>}
        {success && <p className="success">✅ {success}</p>}
        {qrCode && (
          <div className="qr-block">
            <p className="muted" style={{ marginBottom: 8 }}>QR Code — attach to the physical item:</p>
            <img src={qrCode} alt="QR code for material" className="qr-img" />
          </div>
        )}
      </div>

      <div className="card">
        <div className="filter-bar">
          <span className="muted">Filter:</span>
          <button
            className={`filter-btn ${filter === '' ? 'active' : ''}`}
            onClick={() => applyFilter('')}
          >All</button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`filter-btn ${filter === c ? 'active' : ''}`}
              onClick={() => applyFilter(c)}
            >{c}</button>
          ))}
        </div>

        {loading ? (
          <p className="muted">Loading materials…</p>
        ) : materials.length === 0 ? (
          <p className="muted">No materials listed{filter ? ` for category "${filter}"` : ''}.</p>
        ) : (
          <ul className="item-list">
            {materials.map((m) => (
              <li key={m.uuid} className="item-card">
                <div className="item-header">
                  <strong>{m.name}</strong>
                  <CategoryBadge category={m.category} />
                  <span className="item-type-badge">{m.condition}</span>
                </div>
                <div className="item-meta">
                  Qty: {m.quantity} {m.unit}
                  {m.location && <> · {m.location}</>}
                  {m.source_node_name && <> · Source: {m.source_node_name}</>}
                </div>
                {m.description && <p className="item-desc">{m.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
