-- Organization-scoped backlog for suggestions, improvements and bugs.
CREATE TABLE organization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'improvement' CHECK (type IN ('feature', 'improvement', 'bug')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'in_progress', 'done', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX organization_requests_org_status_idx ON organization_requests(organization_id, status);
CREATE INDEX organization_requests_org_created_idx ON organization_requests(organization_id, created_at DESC);
ALTER TABLE organization_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organization_requests FROM anon, authenticated;
