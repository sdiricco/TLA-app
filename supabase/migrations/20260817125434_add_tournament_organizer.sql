alter table public.tournaments
  add column organizer_profile_id uuid;

alter table public.tournaments
  add constraint tournaments_organizer_profile_id_fkey
  foreign key (organizer_profile_id)
  references public.profiles(id)
  on delete set null;

create index tournaments_organizer_profile_id_idx
  on public.tournaments(organizer_profile_id);

-- Existing organization tournaments inherit the oldest owner as a stable,
-- reviewable default. Legacy global tournaments remain without an organizer.
update public.tournaments as tournament
set organizer_profile_id = (
  select membership.profile_id
  from public.organization_memberships as membership
  where membership.organization_id = tournament.organization_id
    and membership.role = 'owner'
  order by membership.created_at asc, membership.profile_id asc
  limit 1
)
where tournament.organizer_profile_id is null
  and tournament.organization_id is not null;
