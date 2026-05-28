const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not defined in environment variables.');
}

// The Pool manages multiple connections for better performance
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/External connections
  }
});

/**
 * Executes a PostgreSQL query
 * @param {string} text - SQL Query
 * @param {Array} params - Parameters for prepared statement
 */
const runQuery = (text, params) => pool.query(text, params);

module.exports = { runQuery };