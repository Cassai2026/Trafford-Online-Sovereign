// Vajra / V-Code — Intent-Based Natural Language Compiler route
// Parses fragmented natural-language intent and routes it to the
// appropriate Tetrad archetype node (Odin / Hekete / Kong / Enki).
// Processing is entirely local — no external cloud APIs.
const router = require('express').Router();
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
};

// ── Keyword routing table ─────────────────────────────────────────────────────
// Maps intent keywords to Tetrad nodes and high-level OS commands.
const ROUTING_TABLE = [
  {
    node:     'odin',
    keywords: ['ledger', 'credit', 'energy', 'carbon', 'asset', 'protect', 'structure', 'geometry', 'audit', 'finance', 'token'],
    label:    'Odin — Structure / Ledger Mathematics',
  },
  {
    node:     'hekete',
    keywords: ['firewall', 'block', 'lock', 'purge', 'route', 'encrypt', 'security', 'crossroads', 'unauthorised', 'hack', 'threat'],
    label:    'Hekete — Firewall / Crossroads',
  },
  {
    node:     'kong',
    keywords: ['compute', 'process', 'power', 'kinetic', 'harvest', 'load', 'heavy', 'cpu', 'dispatch', 'queue', 'gpu'],
    label:    'Kong — Heavy-Compute / Energy Harvesting',
  },
  {
    node:     'enki',
    keywords: ['cool', 'thermal', 'temperature', 'fan', 'fluid', 'hydration', 'saline', 'heat', 'water', 'humid'],
    label:    'Enki — Thermal Cooling / Fluid Dynamics',
  },
];

/**
 * Route an intent string to a Tetrad node based on keyword matching.
 * Returns the first matching node or 'odin' as the default strategic handler.
 *
 * @param {string} intent
 * @returns {{ node: string, label: string }}
 */
function routeIntent(intent) {
  const lower = intent.toLowerCase();
  for (const entry of ROUTING_TABLE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { node: entry.node, label: entry.label };
    }
  }
  return { node: 'odin', label: 'Odin — Structure / Ledger Mathematics' };
}

/**
 * Down-clock an intent string into a structured OS command descriptor.
 * In a full Vajra implementation this would invoke a local language model or
 * a rule-based grammar compiler. Here we produce a deterministic structured
 * output to keep operation 100 % local and zero-cost.
 *
 * @param {string} intent
 * @param {{ node: string, label: string }} route
 * @returns {string}
 */
function compileIntent(intent, route) {
  const ts = new Date().toISOString();
  // Sanitise the intent for safe embedding in the command descriptor:
  // escape backslashes first, then double-quotes.
  const safe = intent.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return [
    `[VAJRA v1.0] ${ts}`,
    `INTENT  : "${intent}"`,
    `ROUTED  → ${route.label.toUpperCase()}`,
    `NODE    : ${route.node.toUpperCase()}`,
    `CMD     : EXEC sovereign_cmd --node=${route.node} --intent="${safe}"`,
    `STATUS  : QUEUED — awaiting edge controller confirmation`,
  ].join('\n');
}

// ── POST /vajra/compile ───────────────────────────────────────────────────────
// Body: { intent: string }
// Returns: { data: { routed_to, node, output } }
router.post(
  '/compile',
  [
    body('intent')
      .isString().withMessage('intent must be a string')
      .trim()
      .notEmpty().withMessage('intent is required')
      .isLength({ max: 500 }).withMessage('intent must be 500 characters or fewer'),
  ],
  validate,
  (req, res) => {
    const { intent } = req.body;
    const route  = routeIntent(intent);
    const output = compileIntent(intent, route);
    return res.json({
      data: {
        routed_to: route.node,
        label:     route.label,
        output,
      },
    });
  }
);

// ── GET /vajra/nodes ──────────────────────────────────────────────────────────
// Returns the Tetrad node manifest (no auth required — public status page).
router.get('/nodes', (_req, res) => {
  return res.json({
    data: ROUTING_TABLE.map(({ node, label, keywords }) => ({
      node,
      label,
      keywords,
    })),
  });
});

module.exports = router;
module.exports.routeIntent   = routeIntent;   // exported for testing
module.exports.compileIntent = compileIntent;
