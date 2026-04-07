# 🌍 Trafford Online — Sovereign OS v1.0

> **15 Billion Hearts · Lilieth NGO · Re-Works Stretford/Trafford**

A modular, decentralized ecosystem built on Node.js, PostgreSQL, React, and Google Enterprise — empowering community sovereignty, skill-sharing, and eco-progress tracking.

---

## File Structure

```
.
├── .github/
│   ├── copilot-instructions.md        # Sovereign Tech coding style
│   └── workflows/
│       ├── ci.yml                     # PR tests
│       ├── deploy-frontend.yml        # GitHub Pages deployment
│       └── deploy-backend.yml         # Google Cloud Run deployment
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                   # Express app entry point
│       ├── db/
│       │   ├── pool.js                # pg connection pool
│       │   ├── schema.sql             # Full PostgreSQL schema
│       │   └── migrate.js             # Migration runner
│       ├── middleware/
│       │   └── auth.js                # JWT + Google SSO
│       └── routes/
│           ├── auth.js                # POST /api/auth/google
│           ├── nodes.js               # Sovereign Nodes CRUD
│           ├── deeds.js               # Deed of Sovereign Transfer
│           ├── materials.js           # Materials Exchange + QR codes
│           ├── service-swap.js        # Service Swap algorithm
│           ├── governance.js          # 14+1 Pillar audits
│           ├── safety.js              # Community Safety reports
│           └── reworks.js             # Re-Works inventory + pollution
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── index.js
│       ├── App.jsx
│       ├── App.css
│       ├── api.js                     # Shared fetch utility
│       └── components/
│           ├── TheMandate.jsx         # 15B Hearts countdown
│           ├── LiveSiteStats.jsx      # Pollution vs Eco-progress chart
│           └── JobBoard.jsx           # Skill-share / labour-swap board
├── google-apps-script/
│   ├── SovereignSync.gs               # Sheets ↔ GitHub DB bi-directional sync
│   └── AppSheetConnector.gs           # Re-Works + Pollution → API
├── nginx/
│   └── nginx.conf                     # Reverse proxy config
├── docker-compose.yml                 # 1-click: Hub + Discourse + Nextcloud
├── .env.example                       # Environment variable template
└── .gitignore
```

---

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start everything with Docker Compose

```bash
docker compose up -d
```

This starts:
| Service    | URL                          | Purpose                              |
|------------|------------------------------|--------------------------------------|
| Hub API    | http://localhost:4000        | Sovereign OS backend                 |
| Discourse  | http://localhost:3200        | Addiction recovery / mentoring forum |
| Nextcloud  | http://localhost:3300        | Community file storage               |

### 3. Run the database migration (first time)

```bash
docker compose exec hub npm run migrate
```

### 4. Run the frontend locally

```bash
cd frontend && npm install && npm start
```

---

## API Reference

| Method | Endpoint                         | Description                          |
|--------|----------------------------------|--------------------------------------|
| POST   | /api/auth/google                 | Exchange Google ID token for JWT     |
| GET    | /api/nodes                       | List sovereign nodes                 |
| POST   | /api/nodes                       | Create a node                        |
| GET    | /api/deeds                       | List deeds of sovereign transfer     |
| POST   | /api/deeds                       | Register a new asset deed            |
| PATCH  | /api/deeds/:uuid/status          | Update deed transfer status          |
| GET    | /api/materials                   | List available materials             |
| POST   | /api/materials                   | List a material item (+ QR code)     |
| GET    | /api/swaps/match?skill=…         | Find nodes that can provide a skill  |
| POST   | /api/swaps                       | Open a swap request (auto-matches)   |
| GET    | /api/governance/pillars          | List the 14+1 pillars                |
| GET    | /api/governance/reflect          | Weekly sovereign alignment check     |
| POST   | /api/governance/audit            | Submit pillar scores                 |
| GET    | /api/safety                      | List open safety reports             |
| POST   | /api/safety                      | Submit a community safety report     |
| GET    | /api/reworks                     | Re-Works inventory                   |
| GET    | /api/reworks/pollution           | Transport pollution log              |

---

## Google Apps Script Setup

1. Open your **High-Value Node Tracker** Google Sheet
2. Extensions → Apps Script → paste `google-apps-script/SovereignSync.gs`
3. Set Script Properties: `API_BASE_URL`, `API_TOKEN`
4. Add a time-driven trigger for `syncAll` (hourly recommended)

For Re-Works/AppSheet: follow the same steps with `AppSheetConnector.gs`.

---

## CI/CD

- **PRs**: Tests run automatically via `ci.yml`
- **`main` push (frontend)**: Auto-deploys to GitHub Pages via `deploy-frontend.yml`
- **`main` push (backend)**: Builds Docker image, pushes to GCP Artifact Registry, deploys to Cloud Run via `deploy-backend.yml`

**Required GitHub secrets/vars:**
- `GCP_SA_KEY` — Google Cloud service account JSON
- `DATABASE_URL` — PostgreSQL connection string (Cloud SQL)
- `JWT_SECRET` — long random string
- `GCP_PROJECT_ID` (var), `GOOGLE_CLIENT_ID` (var), `ALLOWED_ORIGINS` (var), `API_BASE_URL` (var)

---

## The 14+1 Sovereign Pillars

The governance system audits these pillars weekly. All 15 must score ≥ 60/100 for the `gate_passed` flag to be `true`.

1. Economic Sovereignty  2. Land & Housing  3. Food Security  4. Health & Wellbeing
5. Education & Learning  6. Energy & Environment  7. Culture & Heritage
8. Governance & Democracy  9. Technology & Data  10. Safety & Justice
11. Transport & Mobility  12. Care & Mutual Aid  13. Enterprise & Work
14. Spirituality & Purpose  **15. The Mandate (15 Billion Hearts)**

---

## License

This project is governed by the **LILIETH SOVEREIGN PUBLIC LICENSE (LSPL) v1.0 —
The Triple-Tier Shield**. See [LICENSE-LSPL.md](LICENSE-LSPL.md) for the full
multi-layered legal framework.

| Tier | Scope | License |
|---|---|---|
| I – Iron Layer | Source code, kernels, scripts | [GPLv3](LICENSE) |
| II – Creative Layer | UI, icons, docs, assets | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) |
| III – Sovereign Layer | Mission, SDG Nodes, Anti-Rinsing | [LSPL v1.0](LICENSE-LSPL.md) |

> *"Sovereign by design. Community by nature."*
Trafford Online
