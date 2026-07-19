ALTER TABLE organization_requests
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS organization_request_votes (
  request_id UUID NOT NULL REFERENCES organization_requests(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, profile_id)
);

CREATE INDEX IF NOT EXISTS organization_request_votes_profile_idx
  ON organization_request_votes(profile_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-images', 'request-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload request images" ON storage.objects;

CREATE POLICY "Authenticated users can upload request images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-images' AND (storage.foldername(name))[1] = 'requests');
