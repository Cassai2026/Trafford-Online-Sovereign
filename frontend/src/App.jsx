import React, { useState } from 'react';
import TheMandate   from './components/TheMandate';
import LiveSiteStats from './components/LiveSiteStats';
import JobBoard     from './components/JobBoard';
import './App.css';

const TABS = [
  { id: 'mandate',  label: '❤️ The Mandate'  },
  { id: 'stats',    label: '🌿 Live Stats'    },
  { id: 'jobs',     label: '💼 Job Board'     },
];

export default function App() {
  const [tab, setTab] = useState('mandate');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌍 Trafford Online — Sovereign OS</h1>
        <p className="app-tagline">15 Billion Hearts · Lilieth NGO · Re-Works</p>
      </header>

      <nav className="tab-nav">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'mandate' && <TheMandate />}
        {tab === 'stats'   && <LiveSiteStats />}
        {tab === 'jobs'    && <JobBoard />}
      </main>

      <footer className="app-footer">
        <p>Trafford Online Sovereign OS v1.0 · Powered by 15 Billion Hearts · <a href="https://github.com/Cassai2026/Trafford-Online-Sovereign" target="_blank" rel="noreferrer">GitHub</a></p>
      </footer>
    </div>
  );
}
