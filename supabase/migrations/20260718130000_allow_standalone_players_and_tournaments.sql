-- Players and tournaments may be global (organization_id NULL).
ALTER TABLE players
  ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE tournaments
  ALTER COLUMN organization_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
CREATE INDEX IF NOT EXISTS tournaments_organization_id_published_idx
  ON tournaments(organization_id, published);
