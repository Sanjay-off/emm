-- ─────────────────────────────────────────────────────────────
--  Email Service — MySQL Schema
-- ─────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS email_service;
USE email_service;

-- ── email_templates ───────────────────────────────────────────
-- `key`          : unique human-readable identifier used by callers
--                  e.g. "welcome", "promo_q1", "maintenance_notice"
-- `placeholders` : JSON array auto-extracted from html_body on create
--                  e.g. ["name", "email", "reset_link"]
--                  Used at request time to validate that every
--                  required value is present before sending.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  `key`         VARCHAR(100)  NOT NULL UNIQUE,
  subject       VARCHAR(255)  NOT NULL,
  html_body     LONGTEXT      NOT NULL,
  placeholders  JSON          NOT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── users ────────────────────────────────────────────────────
-- Adjust columns to match your real users table.
-- `role` is used to filter recipients for bulk announcements.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  role       VARCHAR(50)  NOT NULL,   -- e.g. 'admin', 'member', 'subscriber'
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);