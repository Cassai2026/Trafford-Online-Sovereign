// Re-Works inventory + transport pollution stats
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// GET /reworks — list inventory
router.get('/', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM reworks_inventory ORDER BY created_at DESC'
  );
  return res.json({ data: rows });
});

// POST /reworks — add inventory item (authenticated)
router.post(
  '/',
  requireAuth,
  [
    body('item_name').notEmpty().withMessage('item_name required'),
    body('quantity').optional().isInt({ min: 0 }),
    body('transport_co2_kg').optional().isNumeric(),
  ],
  validate,
  async (req, res) => {
    const {
      item_name, source = 'biffa', category = '', quantity = 0,
      unit = 'units', container_id = '', build_stage = '', transport_co2_kg = null, notes = '',
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO reworks_inventory
         (item_name, source, category, quantity, unit, container_id, build_stage, transport_co2_kg, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [item_name, source, category, quantity, unit, container_id, build_stage, transport_co2_kg, notes]
    );
    return res.status(201).json({ data: rows[0] });
  }
);

// GET /reworks/pollution — transport pollution log
router.get('/pollution', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM transport_pollution ORDER BY recorded_at DESC LIMIT 100'
  );
  return res.json({ data: rows });
});

// POST /reworks/pollution — log a pollution reading (authenticated)
router.post(
  '/pollution',
  requireAuth,
  [
    body('location').notEmpty().withMessage('location required'),
    body('pm25_ug_m3').optional().isNumeric(),
    body('pm10_ug_m3').optional().isNumeric(),
    body('no2_ug_m3').optional().isNumeric(),
    body('co2_ppm').optional().isNumeric(),
    body('eco_progress_pct').optional().isFloat({ min: 0, max: 100 }),
  ],
  validate,
  async (req, res) => {
    const {
      location, pm25_ug_m3 = null, pm10_ug_m3 = null,
      no2_ug_m3 = null, co2_ppm = null, eco_progress_pct = null,
      source = 'manual',
    } = req.body;

    const { rows } = await db.query(
      `INSERT INTO transport_pollution
         (location, pm25_ug_m3, pm10_ug_m3, no2_ug_m3, co2_ppm, eco_progress_pct, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [location, pm25_ug_m3, pm10_ug_m3, no2_ug_m3, co2_ppm, eco_progress_pct, source]
    );
    return res.status(201).json({ data: rows[0] });
  }
);

module.exports = router;
