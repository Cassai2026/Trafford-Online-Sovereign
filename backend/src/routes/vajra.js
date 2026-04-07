// Vajra / V-Code — Intent-Based Natural Language Compiler route
// Parses fragmented natural-language intent and routes it to the
// appropriate Tetrad archetype node (Odin / Hekete / Kong / Enki).
// Processing is entirely local — no external cloud APIs.
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');

// ── SSE subscriber registry ───────────────────────────────────────────────────
// Stores active SSE response objects for the /stream endpoint.
// When REDIS_URL is set, uses Redis pub/sub for multi-instance deployments;
// falls back to this in-process Set for single-instance / dev deployments.
const sseClients = new Set();

// ── Redis pub/sub (optional) ─────────────────────────────────────────────────
let redisPublisher  = null;
let redisSubscriber = null;

if (process.env.REDIS_URL) {
  const { createClient } = require('redis');

  (async () => {
    redisPublisher  = createClient({ url: process.env.REDIS_URL });
    redisSubscriber = createClient({ url: process.env.REDIS_URL });

    redisPublisher.on('error',  (err) => console.error('[Vajra] Redis publisher error:',  err.message));
    redisSubscriber.on('error', (err) => console.error('[Vajra] Redis subscriber error:', err.message));

    await redisPublisher.connect();
    await redisSubscriber.connect();

    // Fan out ACK events from any Hub instance to local SSE clients
    await redisSubscriber.subscribe('vajra:acks', (message) => {
      sseClients.forEach((client) => client.write(`data: ${message}\n\n`));
    });

    console.info('[Vajra] Redis pub/sub connected');
  })().catch((err) => {
    console.error('[Vajra] Redis setup failed — falling back to in-process broadcast:', err.message);
    redisPublisher  = null;
    redisSubscriber = null;
  });
}

// ── SSE heartbeat ─────────────────────────────────────────────────────────────
// Sends a comment line every 30 s to prevent idle-connection timeout in
// proxies (Cloud Run, nginx) and to flush keep-alive on clients.
setInterval(() => {
  sseClients.forEach((client) => {
    try {
      client.write(': heartbeat\n\n');
    } catch (_) {
      sseClients.delete(client);
    }
  });
}, 30_000);

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
// Authenticated — only sovereign nodes may issue compile commands.
// Body: { intent: string }
// Returns: { data: { routed_to, node, output } }
router.post(
  '/compile',
  requireAuth,
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

// ── GET /vajra/stream ─────────────────────────────────────────────────────────
// Server-Sent Events endpoint — browser/edge controller subscribes here.
// Broadcasts command acknowledgements when POST /vajra/ack is called.
router.get('/stream', (req, res) => {
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',  // disable nginx buffering
  });
  res.flushHeaders();

  // Send a heartbeat comment immediately to confirm the connection and
  // prevent timeout in proxy configurations that close idle connections.
  res.write(': connected\n\n');

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ── POST /vajra/ack ───────────────────────────────────────────────────────────
// Edge controller calls this to confirm a command has been executed.
// Body: { node: string, status?: string, message?: string }
router.post(
  '/ack',
  [
    body('node').isString().withMessage('node is required').trim().notEmpty(),
    body('status').optional().isString(),
    body('message').optional().isString(),
  ],
  validate,
  (req, res) => {
    const { node, status = 'CONFIRMED', message = '' } = req.body;
    const event = JSON.stringify({ node, status, message, ts: new Date().toISOString() });

    // Broadcast via Redis (multi-instance) or directly to local SSE clients
    if (redisPublisher?.isReady) {
      redisPublisher.publish('vajra:acks', event).catch((err) => {
        console.error('[Vajra] Redis publish failed — broadcasting locally:', err.message);
        sseClients.forEach((client) => client.write(`data: ${event}\n\n`));
      });
    } else {
      sseClients.forEach((client) => client.write(`data: ${event}\n\n`));
    }

    return res.json({ data: { broadcast: sseClients.size, node, status } });
  }
);

module.exports = router;
module.exports.routeIntent   = routeIntent;   // exported for testing
module.exports.compileIntent = compileIntent;
module.exports.sseClients    = sseClients;    // exported for testing
