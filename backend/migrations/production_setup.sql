-- ============================================================================
-- AI Resume & Job Matcher - Production Database Schema & Migration Script
-- Compatible with: MySQL 8.0+, TiDB Cloud Serverless, Aiven MySQL, Railway MySQL, AWS RDS, DigitalOcean
-- Character Set: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================================

-- Table 1: users
-- Stores registered user accounts and encrypted password hashes.
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 2: resume_analyses
-- Stores resume-to-job matching results, semantic scores, extracted skills, and suggestions.
-- Only the sanitized resume filename is stored in DB; uploaded document files are kept
-- in private, non-public persistent storage on disk.
CREATE TABLE IF NOT EXISTS `resume_analyses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `job_title` VARCHAR(255) DEFAULT NULL,
  `job_description` TEXT NOT NULL,
  `resume_filename` VARCHAR(255) NOT NULL,
  `match_score` DECIMAL(5, 2) DEFAULT NULL,
  `ats_score` DECIMAL(5, 2) DEFAULT NULL,
  `matched_skills` JSON DEFAULT NULL,
  `missing_skills` JSON DEFAULT NULL,
  `additional_skills` JSON DEFAULT NULL,
  `ats_breakdown` JSON DEFAULT NULL,
  `improvement_suggestions` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_resume_analyses_user_id` (`user_id`),
  KEY `idx_resume_analyses_user_created` (`user_id`, `created_at` DESC),
  CONSTRAINT `chk_match_score_range` CHECK (`match_score` IS NULL OR (`match_score` >= 0 AND `match_score` <= 100)),
  CONSTRAINT `chk_ats_score_range` CHECK (`ats_score` IS NULL OR (`ats_score` >= 0 AND `ats_score` <= 100)),
  CONSTRAINT `fk_resume_analyses_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
