-- Public/private organization discovery. Existing organizations remain private.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS sport TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

UPDATE organizations
SET slug = CASE
  WHEN id = '00000000-0000-4000-8000-000000000001' THEN 'tla'
  ELSE 'organization-' || left(replace(id::text, '-', ''), 12)
END
WHERE slug IS NULL OR slug = '';

ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_key ON organizations(slug);
CREATE INDEX IF NOT EXISTS organizations_visibility_idx ON organizations(visibility);
CREATE INDEX IF NOT EXISTS organizations_search_idx ON organizations USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(sport, '')));

ALTER TABLE organizations
  ADD CONSTRAINT organizations_visibility_check CHECK (visibility IN ('public', 'private'));
