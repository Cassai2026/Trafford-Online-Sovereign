// CRUD for Sovereign Nodes
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// GET /nodes/me — return the sovereign node for the authenticated user
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, uuid, name, bio_roi, skills, constraints, reputation_score, is_active, created_at
     FROM sovereign_nodes WHERE email = $1`,
    [req.user.email]
  );
  if (!rows.length) return res.status(404).json({ error: 'Node not found. Register one first.' });
  return res.json({ data: rows[0] });
});

// GET /nodes — list active nodes; ?format=sheets returns column-ordered rows for SovereignSync.gs
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, uuid, name, bio_roi, skills, constraints, reputation_score, is_active, created_at
     FROM sovereign_nodes WHERE is_active = TRUE ORDER BY reputation_score DESC`
  );

  if (req.query.format === 'sheets') {
    // Return data in the exact column order expected by SovereignSync.gs
    const now = new Date().toISOString();
    return res.json({
      headers: ['UUID', 'Name', 'Bio-ROI', 'Skills (I Can)', 'Constraints (I Don\'t)', 'Reputation Score', 'Last Synced'],
      rows: rows.map((n) => [
        n.uuid,
        n.name,
        n.bio_roi || '',
        Array.isArray(n.skills)      ? n.skills.join(', ')      : '',
        Array.isArray(n.constraints) ? n.constraints.join(', ') : '',
        n.reputation_score,
        now,
      ]),
    });
  }

  return res.json({ data: rows });
});

// GET /nodes/:uuid
router.get(
  '/:uuid',
  [param('uuid').isUUID()],
  validate,
  async (req, res) => {
    const { rows } = await db.query(
      `SELECT id, uuid, name, bio_roi, skills, constraints, reputation_score, email, is_active, created_at
       FROM sovereign_nodes WHERE uuid = $1`,
      [req.params.uuid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Node not found' });
    return res.json({ data: rows[0] });
  }
);

// POST /nodes — create node (authenticated)
router.post(
  '/',
  requireAuth,
  [
    body('name').notEmpty().withMessage('name required'),
    body('bio_roi').optional().isString(),
    body('skills').optional().isArray(),
    body('constraints').optional().isArray(),
  ],
  validate,
  async (req, res) => {
    const { name, bio_roi = '', skills = [], constraints = [] } = req.body;
    const { rows } = await db.query(
      `INSERT INTO sovereign_nodes (name, bio_roi, skills, constraints, email)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, bio_roi, JSON.stringify(skills), JSON.stringify(constraints), req.user.email]
    );
    return res.status(201).json({ data: rows[0] });
  }
);

// PATCH /nodes/:uuid — update node (authenticated)
router.patch(
  '/:uuid',
  requireAuth,
  [param('uuid').isUUID()],
  validate,
  async (req, res) => {
    const allowed = ['name', 'bio_roi', 'skills', 'constraints'];
    const updates = Object.entries(req.body)
      .filter(([k]) => allowed.includes(k))
      .map(([k, v]) => ({ key: k, val: typeof v === 'object' ? JSON.stringify(v) : v }));

    if (!updates.length) return res.status(400).json({ error: 'No updatable fields provided' });

    const setClauses = updates.map((u, i) => `${u.key} = $${i + 2}`).join(', ');
    const values = [req.params.uuid, ...updates.map((u) => u.val)];

    const { rows } = await db.query(
      `UPDATE sovereign_nodes SET ${setClauses} WHERE uuid = $1 RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Node not found' });
    return res.json({ data: rows[0] });
  }
);

// POST /nodes/reputation/recalculate — recompute reputation score for the authenticated user's node.
// Scoring: +10 per completed swap, +3 per governance audit, +2 per safety report (capped at 100).
router.post('/reputation/recalculate', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `WITH target AS (
       SELECT id FROM sovereign_nodes WHERE email = $1
     ),
     swap_score AS (
       SELECT COALESCE(COUNT(*), 0) * 10 AS pts
       FROM service_swaps, target
       WHERE (requester_id = target.id OR provider_id = target.id) AND status = 'completed'
     ),
     audit_score AS (
       SELECT COALESCE(COUNT(*), 0) * 3 AS pts
       FROM pillar_audits, target
       WHERE auditor_id = target.id
     ),
     safety_score AS (
       SELECT COALESCE(COUNT(*), 0) * 2 AS pts
       FROM safety_reports, target
       WHERE reporter_id = target.id
     )
     UPDATE sovereign_nodes
     SET reputation_score = LEAST(100, (
       (SELECT pts FROM swap_score) +
       (SELECT pts FROM audit_score) +
       (SELECT pts FROM safety_score)
     ))
     WHERE email = $1
     RETURNING id, uuid, name, reputation_score`,
    [req.user.email]
  );
  if (!rows.length) return res.status(404).json({ error: 'No sovereign node found for this user' });
  return res.json({ data: rows[0] });
});

module.exports = router;
