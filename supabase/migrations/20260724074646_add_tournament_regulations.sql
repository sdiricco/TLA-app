ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS regulation_path TEXT,
  ADD COLUMN IF NOT EXISTS regulation_name TEXT,
  ADD COLUMN IF NOT EXISTS regulation_content_type TEXT,
  ADD COLUMN IF NOT EXISTS regulation_size BIGINT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tournament-regulations', 'tournament-regulations', false, 6291456, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 6291456,
  allowed_mime_types = NULL;

DROP POLICY IF EXISTS "Users can upload own tournament regulation objects" ON storage.objects;
CREATE POLICY "Users can upload own tournament regulation objects"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tournament-regulations'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Authenticated users can download tournament regulations" ON storage.objects;
CREATE POLICY "Authenticated users can download tournament regulations"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tournament-regulations'
    AND storage.allow_any_operation(ARRAY['object.get_authenticated_info', 'object.get_authenticated'])
  );
