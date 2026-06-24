-- Keep profiles aligned with the Prisma schema and avoid signup trigger failures.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

ALTER TABLE profiles
  ALTER COLUMN email SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'profiles_email_key'
  ) THEN
    CREATE UNIQUE INDEX profiles_email_key ON public.profiles (email);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', 'player')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
