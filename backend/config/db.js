const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Ensure environment variables are loaded
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

/**
 * Build SSL configuration options if SSL is requested or required
 */
const buildSslConfig = () => {
  const sslRequested =
    process.env.DB_SSL === 'true' ||
    process.env.DB_SSL === '1' ||
    process.env.DB_SSL === 'require' ||
    process.env.DB_SSL === 'yes' ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ssl='));

  if (!sslRequested) {
    return undefined;
  }

  const sslOpts = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  };

  if (process.env.DB_CA_CERT) {
    try {
      // Check if DB_CA_CERT is a path to a file or base64 encoded
      if (fs.existsSync(process.env.DB_CA_CERT)) {
        sslOpts.ca = fs.readFileSync(process.env.DB_CA_CERT, 'utf8');
      } else {
        sslOpts.ca = Buffer.from(process.env.DB_CA_CERT, 'base64').toString('utf8');
      }
    } catch (e) {
      console.warn('[DB SSL Warning]: Could not parse DB_CA_CERT, using default CA trust chain:', e.message);
    }
  }

  return sslOpts;
};

/**
 * Configure connection pool parameters
 */
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const sslConfig = buildSslConfig();

let pool;

if (databaseUrl) {
  // Cloud providers providing a complete database URI (e.g. Render, Railway, TiDB)
  const poolOptions = {
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };
  if (sslConfig) {
    poolOptions.ssl = sslConfig;
  }
  pool = mysql.createPool(poolOptions);
} else {
  // Individual environment variables (Aiven, local, self-hosted)
  const poolOptions = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'resume_job_matcher',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };
  if (sslConfig) {
    poolOptions.ssl = sslConfig;
  }
  pool = mysql.createPool(poolOptions);
}

/**
 * Test MySQL database connection
 * Returns safe connection status details without leaking credentials
 */
const testConnection = async () => {
  const targetHost = process.env.DB_HOST || process.env.MYSQLHOST || (databaseUrl ? 'configured-uri' : '127.0.0.1');
  const targetDatabase = process.env.DB_NAME || process.env.MYSQLDATABASE || (databaseUrl ? 'configured-database' : 'resume_job_matcher');

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS test');
    connection.release();
    return {
      connected: true,
      message: 'Database connection established successfully',
      host: targetHost,
      database: targetDatabase,
      ssl: !!sslConfig
    };
  } catch (error) {
    // Attempt local database service recovery if connection was refused
    if (error.code === 'ECONNREFUSED' && !databaseUrl) {
      try {
        const { execSync } = require('child_process');
        execSync('service mariadb start 2>/dev/null || service mysql start 2>/dev/null || true', { stdio: 'ignore' });
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT 1 + 1 AS test');
        connection.release();
        return {
          connected: true,
          message: 'Database connection established successfully after auto-starting service',
          host: targetHost,
          database: targetDatabase,
          ssl: !!sslConfig
        };
      } catch (_) {}
    }

    return {
      connected: false,
      message: `Failed to connect to MySQL database: ${error.message}`,
      code: error.code || 'UNKNOWN_ERROR',
      host: targetHost,
      database: targetDatabase,
      ssl: !!sslConfig
    };
  }
};

module.exports = {
  pool,
  testConnection
};

