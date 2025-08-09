-- Migration: Add recurrence support to events
-- Purpose: Fix missing 'recurrence' column causing schema errors.
-- Safe to run multiple times.

BEGIN;

-- Ensure starts_at index exists for sorting/upcoming queries
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at);

-- Add recurrence column with safe default. Use CHECK constraint to restrict values.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none';

-- Reset and add a CHECK constraint to allow only expected values.
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_recurrence_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_recurrence_check
  CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));

COMMIT;
