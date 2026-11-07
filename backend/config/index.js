const { pool, testConnection } = require('./db');

module.exports = {
  db: pool,
  pool,
  testConnection
};

