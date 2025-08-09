-- Migration: Ensure required columns exist on public.events
-- Adds/normalizes:
--   - starts_at (timestamptz)
--   - recurrence (text, default 'none', with CHECK constraint)
--   - location (text, default 'Mesjid Al Muhajirin')
--   - image_url (text)
--   - description (text)
-- Also backfills from legacy "date" and "time" columns if they exist,
-- and adds an index for starts_at.

BEGIN;

-- 1) Add columns if they don't exist
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS starts_at timestamptz;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description text;

-- 2) Defaults and simple backfills
ALTER TABLE public.events
  ALTER COLUMN recurrence SET DEFAULT 'none';

UPDATE public.events
SET recurrence = 'none'
WHERE recurrence IS NULL;

ALTER TABLE public.events
  ALTER COLUMN location SET DEFAULT 'Mesjid Al Muhajirin';

UPDATE public.events
SET location = 'Mesjid Al Muhajirin'
WHERE location IS NULL OR btrim(location) = '';

-- 3) Best-effort backfill for starts_at from legacy columns if present
DO $$
DECLARE
  has_date boolean;
  has_time boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'date'
  ) INTO has_date;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'time'
  ) INTO has_time;

  IF has_date AND has_time THEN
    -- Assumes "date" is of type date and "time" is of type time
    -- This will implicitly cast to timestamptz using DB timezone settings.
    EXECUTE 'UPDATE public.events SET starts_at = (date::timestamp + time) WHERE starts_at IS NULL';
  ELSIF has_date THEN
    EXECUTE 'UPDATE public.events SET starts_at = date::timestamp WHERE starts_at IS NULL';
  END IF;
END $$;

-- 4) Constrain recurrence values
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_recurrence_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_recurrence_check
  CHECK (recurrence IN (''none'', ''daily'', ''weekly'', ''monthly'', ''yearly''));

-- 5) Useful index for upcoming/sorting
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at);

COMMIT;
