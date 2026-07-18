-- Private organizations can opt into map discovery and receive access requests.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS discoverable BOOLEAN NOT NULL DEFAULT false;

UPDATE organizations
SET discoverable = true
WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS organizations_discoverable_idx
  ON organizations (discoverable, visibility, latitude, longitude);

CREATE TABLE IF NOT EXISTS organization_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, profile_id)
);

CREATE INDEX IF NOT EXISTS organization_access_requests_org_status_idx
  ON organization_access_requests (organization_id, status);

ALTER TABLE organization_access_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organization_access_requests FROM anon, authenticated;
