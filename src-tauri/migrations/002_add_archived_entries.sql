-- Migration 002: add archived column to time_entries for existing installations.
-- New installs get this column from 001_initial.sql directly.
-- SQLite does not support ADD COLUMN IF NOT EXISTS; the caller suppresses the error
-- when the column already exists.
ALTER TABLE time_entries ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
