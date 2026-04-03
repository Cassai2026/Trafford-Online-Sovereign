// Community Safety & Vitality — street-level health and safety reporting
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

const CATEGORIES = ['health', 'safety', 'environment', 'social'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

// GET /safety — list open/acknowledged reports
router.get('/', async (req, res) => {
  const { category, severity } = req.query;
  let sql = `SELECT s.*, n.name AS reporter_name
             FROM safety_reports s
             LEFT JOIN sovereign_nodes n ON n.id = s.reporter_id
             WHERE s.status != 'resolved'`;
  const params = [];
  if (category && CATEGORIES.includes(category)) {
    params.push(category);
    sql += ` AND s.category = $${params.length}`;
  }
  if (severity && SEVERITIES.includes(severity)) {
    params.push(severity);
    sql += ` AND s.severity = $${params.length}`;
  }
  sql += ' ORDER BY s.created_at DESC';
  const { rows } = await db.query(sql, params);
  return res.json({ data: rows });
});

// POST /safety — submit a report (authenticated)
router.post(
  '/',
  requireAuth,
  [
    body('title').notEmpty().withMessage('title required'),
    body('description').notEmpty().withMessage('description required'),
    body('category').isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),
    body('severity').optional().isIn(SEVERITIES),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
  ],
  validate,
  async (req, res) => {
    const {
      title, description, category,
      severity = 'medium', location = '', lat = null, lng = null,
    } = req.body;

    const nodeRes = await db.query(
      'SELECT id FROM sovereign_nodes WHERE email = $1',
      [req.user.email]
    );
    const reporterId = nodeRes.rows[0]?.id ?? null;

    const { rows } = await db.query(
      `INSERT INTO safety_reports (reporter_id, category, severity, title, description, location, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [reporterId, category, severity, title, description, location, lat, lng]
    );
    return res.status(201).json({ data: rows[0] });
  }
);

// PATCH /safety/:uuid/status — update report status (authenticated)
router.patch(
  '/:uuid/status',
  requireAuth,
  [
    param('uuid').isUUID(),
    body('status').isIn(['open', 'acknowledged', 'resolved']).withMessage('Invalid status'),
  ],
  validate,
  async (req, res) => {
    const { status } = req.body;
    const { rows } = await db.query(
      `UPDATE safety_reports
       SET status = $2, resolved_at = CASE WHEN $3::boolean THEN NOW() ELSE NULL END
       WHERE uuid = $1 RETURNING *`,
      [req.params.uuid, status, status === 'resolved']
    );
    if (!rows.length) return res.status(404).json({ error: 'Report not found' });
    return res.json({ data: rows[0] });
  }
);

module.exports = router;
