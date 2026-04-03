// Deed of Sovereign Transfer — tracks land/assets as financial liabilities
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// GET /deeds
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT d.*, n.name AS created_by_name
     FROM sovereign_deeds d
     LEFT JOIN sovereign_nodes n ON n.id = d.created_by
     ORDER BY d.created_at DESC`
  );
  return res.json({ data: rows });
});

// GET /deeds/:uuid
router.get(
  '/:uuid',
  [param('uuid').isUUID()],
  validate,
  async (req, res) => {
    const { rows } = await db.query(
      `SELECT d.*, n.name AS created_by_name
       FROM sovereign_deeds d
       LEFT JOIN sovereign_nodes n ON n.id = d.created_by
       WHERE d.uuid = $1`,
      [req.params.uuid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Deed not found' });
    return res.json({ data: rows[0] });
  }
);

// POST /deeds — register a new asset/deed (authenticated)
router.post(
  '/',
  requireAuth,
  [
    body('asset_name').notEmpty().withMessage('asset_name required'),
    body('asset_type')
      .isIn(['land', 'building', 'equipment', 'fund'])
      .withMessage('asset_type must be land|building|equipment|fund'),
    body('current_holder').notEmpty().withMessage('current_holder required'),
    body('liability_value').optional().isNumeric(),
    body('liability_currency').optional().isLength({ min: 3, max: 3 }),
  ],
  validate,
  async (req, res) => {
    const {
      asset_name,
      asset_type,
      asset_description = '',
      current_holder,
      beneficiary = '',
      liability_value = 0,
      liability_currency = 'GBP',
      legal_reference = '',
      notes = '',
    } = req.body;

    // Resolve the creator's node id from the JWT email
    const nodeRes = await db.query(
      'SELECT id FROM sovereign_nodes WHERE email = $1',
      [req.user.email]
    );
    const created_by = nodeRes.rows[0]?.id ?? null;

    const { rows } = await db.query(
      `INSERT INTO sovereign_deeds
         (asset_name, asset_type, asset_description, current_holder, beneficiary,
          liability_value, liability_currency, legal_reference, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        asset_name, asset_type, asset_description, current_holder, beneficiary,
        liability_value, liability_currency, legal_reference, notes, created_by,
      ]
    );
    return res.status(201).json({ data: rows[0] });
  }
);

// PATCH /deeds/:uuid/status — update transfer status (authenticated)
router.patch(
  '/:uuid/status',
  requireAuth,
  [
    param('uuid').isUUID(),
    body('transfer_status')
      .isIn(['pending', 'in_progress', 'transferred', 'contested'])
      .withMessage('Invalid transfer_status'),
  ],
  validate,
  async (req, res) => {
    const { transfer_status, transfer_date, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE sovereign_deeds
       SET transfer_status = $2, transfer_date = $3, notes = COALESCE($4, notes)
       WHERE uuid = $1 RETURNING *`,
      [req.params.uuid, transfer_status, transfer_date ?? null, notes ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Deed not found' });
    return res.json({ data: rows[0] });
  }
);

module.exports = router;
