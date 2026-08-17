-- Player onboarding originally persisted the submitted name only on the
-- sports profile. Recover it as the account display name without overwriting
-- names that users have already edited explicitly.
UPDATE public.profiles AS profile
SET
  name = BTRIM(player.name),
  updated_at = NOW()
FROM public.players AS player
WHERE
  player.user_id = profile.id
  AND player.organization_id IS NULL
  AND NULLIF(BTRIM(profile.name), '') IS NULL
  AND NULLIF(BTRIM(player.name), '') IS NOT NULL;
