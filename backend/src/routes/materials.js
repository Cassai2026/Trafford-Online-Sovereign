// Materials Exchange API — track timber/metal/appliances + QR code generation
const router = require('express').Router();
const { body, param, validationResult } = require('express-validator');
const QRCode = require('qrcode');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

const CATEGORIES = ['timber', 'metal', 'appliance', 'textile', 'other'];
const CONDITIONS = ['new', 'good', 'fair', 'poor'];

// GET /materials — list available materials
router.get('/', async (req, res) => {
  const { category } = req.query;
  let sql = `SELECT m.*, n.name AS source_node_name
             FROM materials m
             LEFT JOIN sovereign_nodes n ON n.id = m.source_node_id
             WHERE m.available = TRUE`;
  const params = [];
  if (category && CATEGORIES.includes(category)) {
    sql += ` AND m.category = $1`;
    params.push(category);
  }
  sql += ` ORDER BY m.created_at DESC`;
  const { rows } = await db.query(sql, params);
  return res.json({ data: rows });
});

// GET /materials/:uuid
router.get(
  '/:uuid',
  [param('uuid').isUUID()],
  validate,
  async (req, res) => {
    const { rows } = await db.query(
      `SELECT m.*, n.name AS source_node_name
       FROM materials m
       LEFT JOIN sovereign_nodes n ON n.id = m.source_node_id
       WHERE m.uuid = $1`,
      [req.params.uuid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Material not found' });
    return res.json({ data: rows[0] });
  }
);

// POST /materials — list a material item (authenticated)
router.post(
  '/',
  requireAuth,
  [
    body('name').notEmpty().withMessage('name required'),
    body('category').isIn(CATEGORIES).withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),
    body('quantity').optional().isNumeric(),
    body('condition').optional().isIn(CONDITIONS),
  ],
  validate,
  async (req, res) => {
    const {
      name, category, description = '', quantity = 1,
      unit = 'units', condition = 'good', location = '',
    } = req.body;

    // Resolve source node
    const nodeRes = await db.query(
      'SELECT id, uuid FROM sovereign_nodes WHERE email = $1',
      [req.user.email]
    );
    const sourceNode = nodeRes.rows[0];

    // Insert first to get uuid, then generate QR
    const insertRes = await db.query(
      `INSERT INTO materials (name, category, description, quantity, unit, condition, location, source_node_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, category, description, quantity, unit, condition, location, sourceNode?.id ?? null]
    );
    const material = insertRes.rows[0];

    // Generate QR code pointing to the API resource
    const qrUrl = `${process.env.API_BASE_URL || 'https://trafford.online/api'}/materials/${material.uuid}`;
    const qrCode = await QRCode.toDataURL(qrUrl);

    const { rows } = await db.query(
      'UPDATE materials SET qr_code = $1 WHERE id = $2 RETURNING *',
      [qrCode, material.id]
    );
    return res.status(201).json({ data: rows[0] });
  }
);

// PATCH /materials/:uuid — update availability (authenticated)
router.patch(
  '/:uuid/availability',
  requireAuth,
  [param('uuid').isUUID(), body('available').isBoolean()],
  validate,
  async (req, res) => {
    const { rows } = await db.query(
      'UPDATE materials SET available = $2 WHERE uuid = $1 RETURNING *',
      [req.params.uuid, req.body.available]
    );
    if (!rows.length) return res.status(404).json({ error: 'Material not found' });
    return res.json({ data: rows[0] });
  }
);

module.exports = router;
