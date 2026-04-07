import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import TheMandate    from './components/TheMandate';
import LiveSiteStats from './components/LiveSiteStats';
import JobBoard      from './components/JobBoard';
import GenesisEngine from './components/GenesisEngine';
import Deeds         from './components/Deeds';
import Materials     from './components/Materials';
import Safety        from './components/Safety';
import NodeProfile   from './components/NodeProfile';
import ReWorks       from './components/ReWorks';
import Governance    from './components/Governance';
import Login         from './components/Login';
import './App.css';

const TABS = [
  { id: 'mandate',    label: '❤️ The Mandate'    },
  { id: 'stats',      label: '🌿 Live Stats'      },
  { id: 'jobs',       label: '💼 Job Board'       },
  { id: 'deeds',      label: '📜 Deeds'           },
  { id: 'materials',  label: '🔩 Materials'       },
  { id: 'safety',     label: '🛡 Safety'          },
  { id: 'reworks',    label: '♻️ Re-Works'        },
  { id: 'governance', label: '⚖️ Governance'      },
  { id: 'profile',    label: '👤 My Profile'      },
  { id: 'genesis',    label: '⚙ Genesis Engine'  },
];

function AppShell() {
  const [tab, setTab] = useState('mandate');
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌍 Trafford Online — Sovereign OS</h1>
        <p className="app-tagline">15 Billion Hearts · Lilieth NGO · Re-Works</p>
        <div className="auth-bar">
          {user ? (
            <>
              <span className="auth-user">👤 {user.name || user.email}</span>
              <button className="auth-logout-btn" onClick={logout}>Sign Out</button>
            </>
          ) : (
            <Login />
          )}
        </div>
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
        {tab === 'mandate'    && <TheMandate />}
        {tab === 'stats'      && <LiveSiteStats />}
        {tab === 'jobs'       && <JobBoard />}
        {tab === 'deeds'      && <Deeds />}
        {tab === 'materials'  && <Materials />}
        {tab === 'safety'     && <Safety />}
        {tab === 'reworks'    && <ReWorks />}
        {tab === 'governance' && <Governance />}
        {tab === 'profile'    && <NodeProfile />}
        {tab === 'genesis'    && <GenesisEngine />}
      </main>

      <footer className="app-footer">
        <p>Trafford Online Sovereign OS v1.0 · Powered by 15 Billion Hearts · <a href="https://github.com/Cassai2026/Trafford-Online-Sovereign" target="_blank" rel="noreferrer">GitHub</a></p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

