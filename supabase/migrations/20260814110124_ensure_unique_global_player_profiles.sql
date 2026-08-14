create unique index if not exists players_global_user_id_key
  on public.players (user_id)
  where organization_id is null and user_id is not null;
