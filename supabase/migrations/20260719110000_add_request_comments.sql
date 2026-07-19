CREATE TABLE IF NOT EXISTS organization_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES organization_requests(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_request_comments_request_created_idx
  ON organization_request_comments(request_id, created_at);

ALTER TABLE organization_request_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON organization_request_comments FROM anon, authenticated;
