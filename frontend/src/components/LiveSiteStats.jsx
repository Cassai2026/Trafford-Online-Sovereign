import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';

export default function LiveSiteStats() {
  const [pollution, setPollution] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    api.get('/reworks/pollution')
      .then(({ data }) => {
        // Shape for chart: last 20 readings, most recent last
        const shaped = [...data].reverse().slice(0, 20).map((r, i) => ({
          name:     new Date(r.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          'NO₂ (µg/m³)':  r.no2_ug_m3  ?? 0,
          'PM2.5':         r.pm25_ug_m3 ?? 0,
          'Eco Progress %': r.eco_progress_pct ?? 0,
        }));
        setPollution(shaped);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="card">
      <h2>🌿 Live Site Stats — Transport Pollution vs Eco-Empire Progress</h2>
      {loading && <p className="muted">Loading pollution data…</p>}
      {error   && <p className="error">⚠ {error} (showing placeholder)</p>}
      {!loading && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={pollution.length ? pollution : PLACEHOLDER_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
            <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 12 }} />
            <YAxis tick={{ fill: '#aaa', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #3a3a6e' }} />
            <Legend />
            <Line type="monotone" dataKey="NO₂ (µg/m³)"    stroke="#ff6b6b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="PM2.5"           stroke="#ffd166" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Eco Progress %"  stroke="#06d6a0" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}

const PLACEHOLDER_DATA = Array.from({ length: 12 }, (_, i) => ({
  name: `Week ${i + 1}`,
  'NO₂ (µg/m³)':   40 + Math.round(Math.random() * 20),
  'PM2.5':          15 + Math.round(Math.random() * 10),
  'Eco Progress %': Math.round((i / 11) * 60),
}));
