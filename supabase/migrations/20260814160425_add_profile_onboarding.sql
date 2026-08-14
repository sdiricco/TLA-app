ALTER TABLE public.profiles
  ADD COLUMN onboarding_intent TEXT,
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_intent_check
  CHECK (onboarding_intent IS NULL OR onboarding_intent IN ('player', 'manager', 'explore'));

-- Existing accounts that already participate in the product must not be sent
-- through onboarding again after this migration is deployed.
UPDATE public.profiles AS profile
SET
  onboarding_intent = CASE
    WHEN profile.role = 'admin' OR EXISTS (
      SELECT 1
      FROM public.organization_memberships AS membership
      WHERE membership.profile_id = profile.id
        AND membership.role IN ('owner', 'admin')
    ) THEN 'manager'
    WHEN EXISTS (
      SELECT 1
      FROM public.players AS player
      WHERE player.user_id = profile.id
    ) THEN 'player'
    ELSE 'explore'
  END,
  onboarding_completed_at = NOW()
WHERE
  profile.role = 'admin'
  OR EXISTS (
    SELECT 1
    FROM public.organization_memberships AS membership
    WHERE membership.profile_id = profile.id
  )
  OR EXISTS (
    SELECT 1
    FROM public.players AS player
    WHERE player.user_id = profile.id
  );
