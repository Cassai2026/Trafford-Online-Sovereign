// Run schema.sql against the configured DATABASE_URL
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const { pool } = require('./pool');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.info('[migrate] Running schema migration…');
  await pool.query(sql);
  console.info('[migrate] Done.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
