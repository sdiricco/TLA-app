-- Align Supabase database with the current Prisma schema.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS birth_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS photo_url TEXT NULL;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS participant_limit INTEGER NULL,
  ADD COLUMN IF NOT EXISTS group_count INTEGER NULL,
  ADD COLUMN IF NOT EXISTS qualifiers_per_group INTEGER NULL;

