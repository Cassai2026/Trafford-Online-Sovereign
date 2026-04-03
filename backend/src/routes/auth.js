// POST /auth/google  — exchange Google ID token for app JWT
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
// google-auth-library is an optional production dependency; gracefully absent in test/dev
let OAuth2Client;
try { ({ OAuth2Client } = require('google-auth-library')); } catch (_) { /* dev/test mode */ }
const { issueToken } = require('../middleware/auth');
const db = require('../db/pool');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Upsert node from Google profile and return a signed JWT
router.post(
  '/google',
  [body('idToken').notEmpty().withMessage('idToken required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { idToken } = req.body;

    let payload;
    try {
      // Verify with Google when client ID and library are configured
      if (GOOGLE_CLIENT_ID && OAuth2Client) {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
      } else if (process.env.NODE_ENV !== 'production') {
        // Dev-mode bypass: accepts a mock JWT payload for local testing ONLY.
        // Never enabled in production (NODE_ENV check above).
        console.warn('[AUTH] Dev-mode token bypass active. Set GOOGLE_CLIENT_ID for production verification.');
        const decoded = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        payload = { sub: decoded.sub, email: decoded.email, name: decoded.name };
      } else {
        return res.status(503).json({ error: 'Google SSO not configured on this server' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google ID token' });
    }

    // Upsert the sovereign node
    const { rows } = await db.query(
      `INSERT INTO sovereign_nodes (name, email)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
       RETURNING id, uuid, name, email, reputation_score`,
      [payload.name, payload.email]
    );

    const token = issueToken(payload);
    return res.json({ data: { token, node: rows[0] } });
  }
);

module.exports = router;
