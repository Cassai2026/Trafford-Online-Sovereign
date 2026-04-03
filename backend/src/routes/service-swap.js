// Service Swap — match "I Can" nodes with "I Need" nodes by proximity (Stretford/Trafford)
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// GET /swaps — list open swaps with potential matches
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.*,
            r.name  AS requester_name,  r.skills  AS requester_skills,
            p.name  AS provider_name,   p.skills  AS provider_skills
     FROM service_swaps s
     JOIN sovereign_nodes r ON r.id = s.requester_id
     LEFT JOIN sovereign_nodes p ON p.id = s.provider_id
     WHERE s.status IN ('open','matched','in_progress')
     ORDER BY s.created_at DESC`
  );
  return res.json({ data: rows });
});

// GET /swaps/match?skill=painting — find nodes that can provide a skill
router.get('/match', async (req, res) => {
  const { skill } = req.query;
  if (!skill) return res.status(400).json({ error: 'skill query param required' });

  // Use PostgreSQL JSONB contains for skill matching
  const { rows } = await db.query(
    `SELECT id, uuid, name, bio_roi, skills, reputation_score
     FROM sovereign_nodes
     WHERE is_active = TRUE
       AND skills @> $1::jsonb
     ORDER BY reputation_score DESC`,
    [JSON.stringify([skill])]
  );
  return res.json({ data: rows, matched_skill: skill });
});

// POST /swaps — open a new swap request (authenticated)
router.post(
  '/',
  requireAuth,
  [
    body('skill_needed').notEmpty().withMessage('skill_needed required'),
    body('description').optional().isString(),
    body('location').optional().isString(),
  ],
  validate,
  async (req, res) => {
    const { skill_needed, description = '', location = 'Stretford/Trafford' } = req.body;

    // Resolve requester node
    const nodeRes = await db.query(
      'SELECT id FROM sovereign_nodes WHERE email = $1',
      [req.user.email]
    );
    if (!nodeRes.rows.length) {
      return res.status(400).json({ error: 'No sovereign node found for this user' });
    }
    const requesterId = nodeRes.rows[0].id;

    // Auto-match: find the best available provider for the requested skill
    const matchRes = await db.query(
      `SELECT id FROM sovereign_nodes
       WHERE is_active = TRUE
         AND id != $1
         AND skills @> $2::jsonb
       ORDER BY reputation_score DESC
       LIMIT 1`,
      [requesterId, JSON.stringify([skill_needed])]
    );
    const providerId = matchRes.rows[0]?.id ?? null;
    const status = providerId ? 'matched' : 'open';

    const { rows } = await db.query(
      `INSERT INTO service_swaps
         (requester_id, provider_id, skill_needed, description, location, status, matched_at)
       VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $7::boolean THEN NOW() ELSE NULL END) RETURNING *`,
      [requesterId, providerId, skill_needed, description, location, status, !!providerId]
    );
    return res.status(201).json({ data: rows[0], auto_matched: !!providerId });
  }
);

// PATCH /swaps/:uuid/status — update swap lifecycle (authenticated)
router.patch(
  '/:uuid/status',
  requireAuth,
  [
    param('uuid').isUUID(),
    body('status')
      .isIn(['open', 'matched', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  validate,
  async (req, res) => {
    const { status } = req.body;
    const { rows } = await db.query(
      `UPDATE service_swaps
       SET status = $2, completed_at = CASE WHEN $3::boolean THEN NOW() ELSE NULL END
       WHERE uuid = $1 RETURNING *`,
      [req.params.uuid, status, status === 'completed']
    );
    if (!rows.length) return res.status(404).json({ error: 'Swap not found' });
    return res.json({ data: rows[0] });
  }
);

module.exports = router;
