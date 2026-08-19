-- Some legacy sports profiles were created before the account display name was
-- available and therefore stored the email as a temporary player name. Replace
-- only that unmistakable placeholder; explicitly edited player names remain
-- untouched.
update public.players as player
set
  name = btrim(profile.name),
  updated_at = now()
from public.profiles as profile
where
  player.user_id = profile.id
  and nullif(btrim(profile.name), '') is not null
  and (
    nullif(btrim(player.name), '') is null
    or lower(btrim(player.name)) = lower(btrim(profile.email))
  );
