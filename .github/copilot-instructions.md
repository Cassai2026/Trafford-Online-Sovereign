# Sovereign Tech Coding Style

## Core Principles
- **DRY**: Every function does one thing. No duplication.
- **Efficient**: Logic-gate first. Validate inputs before processing. Exit early on failure.
- **Modular**: Each module is independently deployable and testable.
- **Decentralized**: No single point of failure. Design for resilience.

## File & Naming Conventions
- Files: `kebab-case.js` for modules, `PascalCase.jsx` for React components.
- Variables: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Database tables: `snake_case`. API routes: `/kebab-case`.

## Logic-Gate Priority Pattern
```js
// ALWAYS validate inputs first, process last
function handler(req, res) {
  if (!req.body.field) return res.status(400).json({ error: 'field required' });
  // ... logic
}
```

## Backend Rules
- Express routes live in `src/routes/`. One file per domain.
- All DB queries go through `src/db/pool.js`. No raw connection strings in routes.
- Return `{ data, error }` shape from all API endpoints. Never throw unhandled rejections.
- Log with `console.error` for errors, `console.info` for lifecycle events only.

## Frontend Rules
- React functional components only. No class components.
- Co-locate component styles in the same directory.
- `fetch` wrapped in a shared `api.js` utility — never raw fetch in components.
- All env vars prefixed `REACT_APP_`.

## Database Rules
- Every table has `id SERIAL PRIMARY KEY`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
- Use parameterized queries exclusively — no string interpolation in SQL.
- Migrations live in `backend/src/db/migrations/`.

## Security
- No secrets in source code. Use environment variables loaded via `.env` (gitignored).
- All external inputs sanitized before DB insertion.
- HTTPS only in production. Strict CORS policy.

## Sovereign Mission Alignment
- Code must serve the 15 Billion Hearts mandate: community-first, zero-exploitation.
- Features touching financial assets, land, or governance require a code-review gate before merge.
- The 14+1 pillars audit runs weekly — logic gates in `governance/` must remain intact.
