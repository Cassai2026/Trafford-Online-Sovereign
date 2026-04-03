// JWT-based auth middleware + Google Workspace SSO helper
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET is not set in production. Refusing to start.');
    process.exit(1);
  } else {
    console.warn('[WARN] JWT_SECRET not set. Using insecure dev default — do NOT use in production.');
  }
}
const SIGNING_SECRET = JWT_SECRET || 'dev-only-insecure-secret';

/**
 * Middleware: verify Bearer JWT on protected routes.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    req.user = jwt.verify(token, SIGNING_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Issue a JWT for a verified Google Workspace user.
 * Call this after validating the Google ID token server-side.
 * @param {{ sub: string, email: string, name: string }} googlePayload
 */
function issueToken(googlePayload) {
  return jwt.sign(
    {
      sub: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name,
    },
    SIGNING_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = { requireAuth, issueToken };
