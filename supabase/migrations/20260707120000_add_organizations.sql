-- Multi-organization foundation. Application data is accessed through Express;
-- Supabase remains the identity provider.

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_memberships (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, profile_id)
);

CREATE INDEX organization_memberships_profile_id_idx ON organization_memberships(profile_id);

-- Preserve current records inside an initial organization.
INSERT INTO organizations (id, name, join_code)
VALUES ('00000000-0000-4000-8000-000000000001', 'TLA', encode(gen_random_bytes(18), 'hex'));

INSERT INTO organization_memberships (organization_id, profile_id, role)
SELECT
  '00000000-0000-4000-8000-000000000001',
  id,
  CASE WHEN role = 'admin' THEN 'admin' ELSE 'member' END
FROM profiles;

ALTER TABLE players ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tournaments ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE players SET organization_id = '00000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;
UPDATE tournaments SET organization_id = '00000000-0000-4000-8000-000000000001' WHERE organization_id IS NULL;

ALTER TABLE players ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tournaments ALTER COLUMN organization_id SET NOT NULL;

DROP INDEX IF EXISTS players_user_id_unique;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_key;
CREATE UNIQUE INDEX players_organization_id_user_id_key
  ON players(organization_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX players_organization_id_idx ON players(organization_id);
CREATE INDEX tournaments_organization_id_idx ON tournaments(organization_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- All application reads and writes go through the authenticated Express API.
-- Removing Data API grants prevents a client from bypassing organization checks.
REVOKE ALL ON organizations, organization_memberships, players, tournaments, tournament_players, matches FROM anon, authenticated;

