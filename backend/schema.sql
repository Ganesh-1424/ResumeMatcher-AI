-- ============================================================================
-- AI Resume & Job Matcher - Database Schema Initialization
-- Database: resume_job_matcher
-- Character Set: utf8mb4, Collation: utf8mb4_unicode_ci
-- ============================================================================

-- Create database if it does not already exist
CREATE DATABASE IF NOT EXISTS `resume_job_matcher`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `resume_job_matcher`;

-- ============================================================================
-- 1. Table: users
-- Stores registered accounts for authentication and ownership of analyses.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NULL DEFAULT NULL,
  `google_id` VARCHAR(100) NULL DEFAULT NULL,
  `avatar_url` VARCHAR(500) NULL DEFAULT NULL,
  `auth_provider` VARCHAR(20) NOT NULL DEFAULT 'local',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_google_id` (`google_id`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. Table: resume_analyses
-- Stores resume-to-job matching results, scores, extracted skills, and suggestions.
-- Only the resume filename is stored; uploaded files are handled on disk.
-- ============================================================================
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

-- ============================================================================
-- 3. Table: saved_resumes
-- Stores resumes created in the AI Resume Builder with structured sections.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `saved_resumes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL DEFAULT 'Untitled Resume',
  `template` VARCHAR(50) NOT NULL DEFAULT 'modern',
  `personal_info` JSON NOT NULL,
  `summary` TEXT NULL,
  `education` JSON NULL,
  `skills` JSON NULL,
  `experience` JSON NULL,
  `projects` JSON NULL,
  `certifications` JSON NULL,
  `additional_info` TEXT NULL,
  `ats_score` DECIMAL(5, 2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_saved_resumes_user_id` (`user_id`),
  KEY `idx_saved_resumes_user_created` (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_saved_resumes_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
