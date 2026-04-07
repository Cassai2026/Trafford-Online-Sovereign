import React, { useState, useRef } from 'react';
import { api } from '../api';

// ── Tetrad node metadata ─────────────────────────────────────────────────────
const TETRAD_NODES = [
  {
    id:    'odin',
    icon:  '⚖️',
    name:  'ODIN',
    role:  'Structure · Strategy · Ledger Mathematics',
    badge: 'ONLINE',
  },
  {
    id:    'hekete',
    icon:  '🔒',
    name:  'HEKETE',
    role:  'Firewall · Crossroads · Encrypted Mesh',
    badge: 'ONLINE',
  },
  {
    id:    'kong',
    icon:  '⚡',
    name:  'KONG',
    role:  'Heavy Compute · Kinetic Energy Harvest',
    badge: 'ONLINE',
  },
  {
    id:    'enki',
    icon:  '🌊',
    name:  'ENKI',
    role:  'Thermal Cooling · Fluid Dynamics · Hydration',
    badge: 'STANDBY',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function GenesisEngine() {
  const [intent, setIntent]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [response, setResponse] = useState(null);   // { text, status }
  const [log, setLog]           = useState([]);      // command history
  const inputRef = useRef(null);

  function appendLog(entry) {
    setLog((prev) => [entry, ...prev].slice(0, 50));  // keep last 50
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = intent.trim();
    if (!trimmed) return;

    setLoading(true);
    setResponse({ text: '▋ Processing intent…', status: 'loading' });

    try {
      const data = await api.post('/vajra/compile', { intent: trimmed });
      setResponse({ text: data.data.output, status: 'ok' });
      appendLog({
        ts:     new Date().toLocaleTimeString(),
        intent: trimmed,
        node:   data.data.routed_to,
        ok:     true,
      });
    } catch (err) {
      setResponse({ text: `ERROR: ${err.message}`, status: 'error' });
      appendLog({
        ts:     new Date().toLocaleTimeString(),
        intent: trimmed,
        node:   'N/A',
        ok:     false,
      });
    } finally {
      setLoading(false);
      setIntent('');
      inputRef.current?.focus();
    }
  }

  const responseClass = `vajra-response ${response ? response.status : 'idle'}`;
  const responseText  = response
    ? response.text
    : '> Awaiting sovereign command…\n> Type your intent and press EXECUTE';

  return (
    <div>
      {/* Header */}
      <div className="genesis-header">
        <h2>⚙ Genesis Engine — Lilius Interface</h2>
        <p>Vajra / V-Code · Intent-Based Natural Language Compiler</p>
      </div>

      {/* Vajra NLP input */}
      <div className="card">
        <form className="vajra-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="vajra-input"
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Speak your intent… e.g. 'route energy surplus to Odin ledger'"
            disabled={loading}
            autoComplete="off"
            spellCheck="false"
          />
          <button className="vajra-btn" type="submit" disabled={loading || !intent.trim()}>
            {loading ? 'COMPILING…' : 'EXECUTE ▶'}
          </button>
        </form>

        {/* Terminal response */}
        <pre className={responseClass}>{responseText}</pre>
      </div>

      {/* Tetrad node status */}
      <div className="card">
        <h2>Tetrad Algorithm — Node Status</h2>
        <div className="tetrad-grid">
          {TETRAD_NODES.map((node) => (
            <div key={node.id} className="tetrad-node">
              <div className="tetrad-node-icon">{node.icon}</div>
              <div className="tetrad-node-name">{node.name}</div>
              <div className="tetrad-node-role">{node.role}</div>
              <span className={`tetrad-node-badge ${node.badge === 'ONLINE' ? 'badge-online' : 'badge-standby'}`}>
                {node.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Command log */}
      {log.length > 0 && (
        <div className="card">
          <h2>Command Log</h2>
          <ul className="command-log">
            {log.map((entry, i) => (
              <li key={i} className="command-log-item">
                <div className="command-log-meta">
                  {entry.ts}
                  <span className="command-log-node"> → {entry.node}</span>
                </div>
                <span className="command-log-intent">{entry.intent}</span>
                {' '}
                <span className={entry.ok ? 'command-log-status-ok' : 'command-log-status-error'}>
                  {entry.ok ? '✓' : '✗'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
