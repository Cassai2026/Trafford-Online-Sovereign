// DB connection pool — all queries must go through this module
const { Pool } = require('pg');

// SSL configuration for production:
// - Set DATABASE_URL with ?sslmode=require for managed PostgreSQL (Cloud SQL, etc.)
// - Set PG_SSL_REJECT_UNAUTHORIZED=false ONLY when using self-signed certificates
//   and you fully understand the MITM risk. Default is true (verified certs).
const sslConfig = process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a parameterized query.
 * @param {string} text  SQL string with $1, $2 … placeholders
 * @param {Array}  params
 * @returns {Promise<{rows: Array, rowCount: number}>}
 */
async function query(text, params = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'test') {
    console.info(`[DB] query(${duration}ms) rows=${result.rowCount}`);
  }
  return result;
}

module.exports = { query, pool };
