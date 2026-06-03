const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

const pool = new Pool({
    connectionString: DATABASE_URL,

    ssl: process.env.NODE_ENV === 'production' ? true : {
        rejectUnauthorized: false
    },

    connectionTimeoutMillis: 10000
});

const runQuery = (text, params) =>
    pool.query(text, params);

module.exports = { runQuery };