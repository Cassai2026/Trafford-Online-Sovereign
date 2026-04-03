// JWT-based auth middleware + Google Workspace SSO helper
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * Middleware: verify Bearer JWT on protected routes.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
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
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

module.exports = { requireAuth, issueToken };
