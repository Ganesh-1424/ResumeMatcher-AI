-- ============================================================================
-- Migration 001: Add additional_skills Column to resume_analyses
-- Task 25: Implement Resume Skill Gap Analysis API
-- Safe migration: preserves all existing data and does not drop tables.
-- ============================================================================

USE `resume_job_matcher`;

-- Safely add 'additional_skills' column if it does not already exist
-- Stores candidate skills identified in resume that were not required by job description
ALTER TABLE `resume_analyses`
ADD COLUMN IF NOT EXISTS `additional_skills` JSON DEFAULT NULL
AFTER `missing_skills`;
