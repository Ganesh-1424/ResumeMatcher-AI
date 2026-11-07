-- ============================================================================
-- Migration 002: Add Google Authentication Support to users table
-- Task 36: Integrate Google Authentication
-- Safe migration: preserves all existing users and data, does not drop tables.
-- ============================================================================

USE `resume_job_matcher`;

-- 1. Modify password_hash to allow NULL for Google-only authentication
ALTER TABLE `users`
  MODIFY COLUMN `password_hash` VARCHAR(255) NULL DEFAULT NULL;

-- 2. Add google_id column for stable OpenID Connect subject ID ('sub')
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `google_id` VARCHAR(100) NULL DEFAULT NULL
  AFTER `password_hash`;

-- 3. Add avatar_url column for optional Google profile picture
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `avatar_url` VARCHAR(500) NULL DEFAULT NULL
  AFTER `google_id`;

-- 4. Add auth_provider column to distinguish local, google, or hybrid accounts
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `auth_provider` VARCHAR(20) NOT NULL DEFAULT 'local'
  AFTER `avatar_url`;

-- 5. Add unique index on google_id if it does not already exist
SET @exist := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'uk_users_google_id'
);
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `users` ADD UNIQUE KEY `uk_users_google_id` (`google_id`)', 'SELECT 1');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
