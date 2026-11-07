const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('./config/db');

/**
 * Migration & Schema Initialization Script
 * Reads schema.sql or executes DDL statements to set up MySQL tables.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */
async function initDatabase() {
  console.log('----------------------------------------------------');
  console.log(' AI Resume & Job Matcher - Database Initialization');
  console.log('----------------------------------------------------');

  // 1. Verify connectivity
  const status = await testConnection();
  if (!status.connected) {
    console.error('❌ Database connection failed!');
    console.error(`   Host: ${status.host}`);
    console.error(`   Database: ${status.database}`);
    console.error(`   Reason: ${status.message}`);
    console.error('\nPlease verify your MySQL server is running and your .env credentials are correct.');
    process.exit(1);
  }

  console.log(`✅ Connected to MySQL database "${status.database}" on ${status.host}`);

  let connection;
  try {
    connection = await pool.getConnection();

    // 2. Define schema statements individually for clean execution and logging
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS \`users\` (
            \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            \`name\` VARCHAR(100) NOT NULL,
            \`email\` VARCHAR(191) NOT NULL,
            \`password_hash\` VARCHAR(255) NULL DEFAULT NULL,
            \`google_id\` VARCHAR(100) NULL DEFAULT NULL,
            \`avatar_url\` VARCHAR(500) NULL DEFAULT NULL,
            \`auth_provider\` VARCHAR(20) NOT NULL DEFAULT 'local',
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`uk_users_email\` (\`email\`),
            UNIQUE KEY \`uk_users_google_id\` (\`google_id\`),
            KEY \`idx_users_created_at\` (\`created_at\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
      },
      {
        name: 'resume_analyses',
        sql: `
          CREATE TABLE IF NOT EXISTS \`resume_analyses\` (
            \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            \`user_id\` INT UNSIGNED NOT NULL,
            \`job_title\` VARCHAR(255) DEFAULT NULL,
            \`job_description\` TEXT NOT NULL,
            \`resume_filename\` VARCHAR(255) NOT NULL,
            \`match_score\` DECIMAL(5, 2) DEFAULT NULL,
            \`ats_score\` DECIMAL(5, 2) DEFAULT NULL,
            \`matched_skills\` JSON DEFAULT NULL,
            \`missing_skills\` JSON DEFAULT NULL,
            \`additional_skills\` JSON DEFAULT NULL,
            \`ats_breakdown\` JSON DEFAULT NULL,
            \`improvement_suggestions\` JSON DEFAULT NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`idx_resume_analyses_user_id\` (\`user_id\`),
            KEY \`idx_resume_analyses_user_created\` (\`user_id\`, \`created_at\` DESC),
            CONSTRAINT \`chk_match_score_range\` CHECK (\`match_score\` IS NULL OR (\`match_score\` >= 0 AND \`match_score\` <= 100)),
            CONSTRAINT \`chk_ats_score_range\` CHECK (\`ats_score\` IS NULL OR (\`ats_score\` >= 0 AND \`ats_score\` <= 100)),
            CONSTRAINT \`fk_resume_analyses_user\` 
              FOREIGN KEY (\`user_id\`) 
              REFERENCES \`users\` (\`id\`)\n              ON DELETE CASCADE 
              ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
      },
      {
        name: 'saved_resumes',
        sql: `
          CREATE TABLE IF NOT EXISTS \`saved_resumes\` (
            \`id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            \`user_id\` INT UNSIGNED NOT NULL,
            \`title\` VARCHAR(255) NOT NULL DEFAULT 'Untitled Resume',
            \`template\` VARCHAR(50) NOT NULL DEFAULT 'modern',
            \`personal_info\` JSON NOT NULL,
            \`summary\` TEXT NULL,
            \`education\` JSON NULL,
            \`skills\` JSON NULL,
            \`experience\` JSON NULL,
            \`projects\` JSON NULL,
            \`certifications\` JSON NULL,
            \`additional_info\` TEXT NULL,
            \`ats_score\` DECIMAL(5, 2) DEFAULT NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`idx_saved_resumes_user_id\` (\`user_id\`),
            KEY \`idx_saved_resumes_user_created\` (\`user_id\`, \`created_at\` DESC),
            CONSTRAINT \`fk_saved_resumes_user\` 
              FOREIGN KEY (\`user_id\`) 
              REFERENCES \`users\` (\`id\`) 
              ON DELETE CASCADE 
              ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `
      }
    ];

    for (const table of tables) {
      process.stdout.write(`Creating table "${table.name}" if not exists... `);
      await connection.query(table.sql);
      console.log('✅ Done');
    }

    // 3. Safe Migrations: ensure additional_skills column exists (Task 25)
    try {
      const [colCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'resume_analyses' 
          AND COLUMN_NAME = 'additional_skills'
      `);
      if (colCheck.length === 0) {
        process.stdout.write('Applying migration 001: Adding additional_skills column... ');
        await connection.query(`
          ALTER TABLE \`resume_analyses\` 
          ADD COLUMN \`additional_skills\` JSON DEFAULT NULL 
          AFTER \`missing_skills\`
        `);
        console.log('✅ Done');
      }
    } catch (migErr) {
      console.warn('Migration 001 notice:', migErr.message);
    }

    // 4. Safe Migrations: ensure Google Auth columns exist in users table (Task 36)
    try {
      const [googleColCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'google_id'
      `);
      if (googleColCheck.length === 0) {
        process.stdout.write('Applying migration 002: Adding Google authentication columns to users table... ');
        await connection.query(`
          ALTER TABLE \`users\`
          MODIFY COLUMN \`password_hash\` VARCHAR(255) NULL DEFAULT NULL,
          ADD COLUMN \`google_id\` VARCHAR(100) NULL DEFAULT NULL AFTER \`password_hash\`,
          ADD COLUMN \`avatar_url\` VARCHAR(500) NULL DEFAULT NULL AFTER \`google_id\`,
          ADD COLUMN \`auth_provider\` VARCHAR(20) NOT NULL DEFAULT 'local' AFTER \`avatar_url\`
        `);

        const [idxCheck] = await connection.query(`
          SELECT INDEX_NAME 
          FROM INFORMATION_SCHEMA.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND INDEX_NAME = 'uk_users_google_id'
        `);
        if (idxCheck.length === 0) {
          await connection.query(`ALTER TABLE \`users\` ADD UNIQUE KEY \`uk_users_google_id\` (\`google_id\`)`);
        }
        console.log('✅ Done');
      }
    } catch (migErr) {
      console.warn('Migration 002 notice:', migErr.message);
    }

    // 5. Safe Migrations: ensure previous_password_hash column exists in users table (Task 43)
    try {
      const [prevColCheck] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'previous_password_hash'
      `);
      if (prevColCheck.length === 0) {
        process.stdout.write('Applying migration 003: Adding previous_password_hash to users table... ');
        await connection.query(`
          ALTER TABLE \`users\`
          ADD COLUMN \`previous_password_hash\` VARCHAR(255) NULL DEFAULT NULL AFTER \`password_hash\`
        `);
        console.log('✅ Done');
      }
    } catch (migErr) {
      console.warn('Migration 003 notice:', migErr.message);
    }

    // 3. Sync any users registered in fallback store to MySQL
    try {
      const { loadFallbackStore } = require('./config/persistentStore');
      const fallback = loadFallbackStore();
      if (fallback.users && fallback.users.length > 0) {
        for (const u of fallback.users) {
          if (u.email && u.password_hash) {
            await connection.execute(
              `INSERT IGNORE INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
              [u.name || 'User', u.email.toLowerCase().trim(), u.password_hash, u.created_at ? new Date(u.created_at) : new Date()]
            );
          }
        }
      }
    } catch (_) {}

    console.log('\nAll tables initialized successfully!');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('\n❌ Error executing schema initialization:');
    console.error(err);
    if (require.main === module) process.exit(1);
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
    // Close pool ONLY if run as standalone script from CLI
    if (require.main === module) {
      await pool.end();
    }
  }
}

// Execute if run directly from CLI
if (require.main === module) {
  initDatabase().catch((err) => {
    console.error('Unexpected failure:', err);
    process.exit(1);
  });
}

module.exports = initDatabase;
