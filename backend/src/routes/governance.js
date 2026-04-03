// Decentralized Governance — 14+1 Pillar audits & sovereign reflection check
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

/**
 * Returns the ISO Monday date string for the current week.
 */
function currentWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// GET /governance/pillars — list all 14+1 pillars
router.get('/pillars', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM governance_pillars WHERE is_active = TRUE ORDER BY pillar_number'
  );
  return res.json({ data: rows });
});

// GET /governance/audit — latest weekly audit summary
router.get('/audit', async (req, res) => {
  const week = req.query.week || currentWeekStart();
  const { rows } = await db.query(
    `SELECT pa.*, gp.pillar_name, gp.pillar_number
     FROM pillar_audits pa
     JOIN governance_pillars gp ON gp.id = pa.pillar_id
     WHERE pa.audit_week = $1
     ORDER BY gp.pillar_number`,
    [week]
  );

  const balanced = rows.filter((r) => r.is_balanced).length;
  const total = rows.length;
  const allBalanced = total === 15 && balanced === 15;

  return res.json({
    data: {
      week,
      pillars_audited: total,
      pillars_balanced: balanced,
      all_balanced: allBalanced,
      gate_passed: allBalanced,
      entries: rows,
    },
  });
});

// POST /governance/audit — submit scores for the current week (authenticated)
router.post(
  '/audit',
  requireAuth,
  [
    body('scores')
      .isArray({ min: 1 })
      .withMessage('scores must be a non-empty array'),
    body('scores.*.pillar_id').isInt({ min: 1 }).withMessage('pillar_id must be a positive integer'),
    body('scores.*.score').isFloat({ min: 0, max: 100 }).withMessage('score must be 0–100'),
  ],
  validate,
  async (req, res) => {
    const { scores, week } = req.body;
    const auditWeek = week || currentWeekStart();

    const nodeRes = await db.query(
      'SELECT id FROM sovereign_nodes WHERE email = $1',
      [req.user.email]
    );
    const auditorId = nodeRes.rows[0]?.id ?? null;

    const inserted = [];
    for (const { pillar_id, score, notes = '' } of scores) {
      const { rows } = await db.query(
        `INSERT INTO pillar_audits (audit_week, pillar_id, score, notes, auditor_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (audit_week, pillar_id)
         DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes
         RETURNING *`,
        [auditWeek, pillar_id, score, notes, auditorId]
      );
      inserted.push(rows[0]);
    }

    const balanced = inserted.filter((r) => r.is_balanced).length;
    return res.status(201).json({
      data: {
        week: auditWeek,
        submitted: inserted.length,
        balanced,
        gate_passed: inserted.length === 15 && balanced === 15,
        entries: inserted,
      },
    });
  }
);

// GET /governance/reflect — sovereign reflection: check if the 14+1 pillars are in balance this week
router.get('/reflect', async (req, res) => {
  const week = currentWeekStart();
  const { rows } = await db.query(
    `SELECT COUNT(*) FILTER (WHERE is_balanced) AS balanced,
            COUNT(*)                              AS total
     FROM pillar_audits
     WHERE audit_week = $1`,
    [week]
  );
  const { balanced, total } = rows[0];
  const gatePassed = parseInt(total) === 15 && parseInt(balanced) === 15;

  return res.json({
    data: {
      week,
      gate_passed: gatePassed,
      message: gatePassed
        ? 'All 14+1 pillars are balanced. The sovereign mission is aligned.'
        : `Alignment incomplete: ${balanced}/${total} pillars balanced this week.`,
    },
  });
});

module.exports = router;
