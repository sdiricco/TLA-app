-- Application data is accessed through Express. Keep the old Data API tables
-- explicitly private and remove permissive policies left by the first schema.
revoke all on table
  public.players,
  public.tournaments,
  public.tournament_players,
  public.matches
from anon, authenticated;

drop policy if exists "Authenticated users can insert players" on public.players;
drop policy if exists "Authenticated users can update players" on public.players;
drop policy if exists "Authenticated users can delete players" on public.players;
drop policy if exists "Players can read own player record" on public.players;
drop policy if exists "Authenticated users can update tournament_players" on public.tournament_players;

-- Cache the authenticated user id once per statement in the policies that are
-- still used through the Supabase Data API.
alter policy "Users can insert own profile"
  on public.profiles
  with check (id = (select auth.uid()));

alter policy "Users can read own profile"
  on public.profiles
  using (
    id = (select auth.uid())
    or get_my_role() = 'admin'
  );

alter policy "Users can update own profile name"
  on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "Admins can read all tournaments"
  on public.tournaments
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
    or published = true
  );

alter policy "Players can enroll themselves"
  on public.tournament_players
  with check (
    exists (
      select 1
      from public.players
      where players.user_id = (select auth.uid())
        and players.id = tournament_players.player_id
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

alter policy "Players can withdraw themselves"
  on public.tournament_players
  using (
    exists (
      select 1
      from public.players
      where players.user_id = (select auth.uid())
        and players.id = tournament_players.player_id
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

alter function public.update_updated_at() set search_path = '';
