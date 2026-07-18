-- Coordinates used by the public organization map.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT organizations_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

CREATE INDEX IF NOT EXISTS organizations_public_map_idx
  ON organizations (visibility, latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
