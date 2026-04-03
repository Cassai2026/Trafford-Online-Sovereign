import React, { useEffect, useState } from 'react';
import { api } from '../api';

const FIFTEEN_BILLION = 15_000_000_000;

export default function TheMandate() {
  const [nodes, setNodes]       = useState([]);
  const [reflect, setReflect]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/nodes').catch(() => ({ data: [] })),
      api.get('/governance/reflect').catch(() => ({ data: null })),
    ]).then(([nodesRes, reflectRes]) => {
      setNodes(nodesRes.data || []);
      setReflect(reflectRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const heartCount = nodes.length;
  const pct        = Math.min((heartCount / FIFTEEN_BILLION) * 100, 100);
  const formatted  = FIFTEEN_BILLION.toLocaleString('en-GB');

  return (
    <section className="card mandate-card">
      <h2>❤️ The Mandate — 15 Billion Hearts</h2>
      <p className="mandate-sub">
        Every sovereign node is a heart connected to the global mission of liberation, equity, and abundance.
      </p>
      <div className="mandate-counter">
        <span className="mandate-count">{heartCount.toLocaleString('en-GB')}</span>
        <span className="mandate-of"> / {formatted}</span>
      </div>
      <div className="progress-bar-container" title={`${pct.toFixed(6)}% of the mandate`}>
        <div className="progress-bar" style={{ width: `${Math.max(pct, 0.5)}%` }} />
      </div>
      <p className="mandate-pct">{pct.toFixed(6)}% of the 15 Billion Hearts mandate activated</p>

      {reflect && (
        <div className={`reflect-gate ${reflect.gate_passed ? 'gate-ok' : 'gate-warn'}`}>
          {reflect.gate_passed
            ? '✅ Sovereign Reflection: All 14+1 Pillars Aligned This Week'
            : `⚠️ ${reflect.message}`}
        </div>
      )}
      {loading && <p className="muted">Connecting to the sovereign network…</p>}
    </section>
  );
}
