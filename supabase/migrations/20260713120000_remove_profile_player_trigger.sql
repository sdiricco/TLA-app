-- Players are organization-scoped now. Do not create a player at signup,
-- because a new account has not selected an organization yet.
DROP TRIGGER IF EXISTS create_player_on_profile_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.create_player_on_profile();
