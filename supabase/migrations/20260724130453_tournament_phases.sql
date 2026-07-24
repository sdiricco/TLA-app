-- Tournament phases make competition structure explicit while preserving the
-- existing tournament-level format for backwards compatibility.
create table tournament_phases (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  position integer not null,
  name text not null,
  format text not null
    check (format in ('round_robin', 'single_elimination')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed')),
  group_count integer not null default 1
    check (group_count > 0),
  qualifiers_per_group integer
    check (qualifiers_per_group is null or qualifiers_per_group > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_phases_tournament_position_key unique (tournament_id, position)
);

create index tournament_phases_tournament_status_idx
  on tournament_phases(tournament_id, status, position);

create trigger tournament_phases_updated_at
  before update on tournament_phases
  for each row execute function update_updated_at();

create table tournament_groups (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references tournament_phases(id) on delete cascade,
  position integer not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint tournament_groups_phase_position_key unique (phase_id, position)
);

create index tournament_groups_phase_id_idx on tournament_groups(phase_id);

create table tournament_phase_players (
  phase_id uuid not null references tournament_phases(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  group_id uuid references tournament_groups(id) on delete set null,
  seed integer,
  source_rank integer,
  qualified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (phase_id, player_id)
);

create index tournament_phase_players_player_id_idx
  on tournament_phase_players(player_id);
create index tournament_phase_players_group_id_idx
  on tournament_phase_players(group_id);
create index tournament_phase_players_phase_seed_idx
  on tournament_phase_players(phase_id, seed);

alter table matches
  add column phase_id uuid references tournament_phases(id) on delete cascade,
  add column group_id uuid references tournament_groups(id) on delete cascade;

create index matches_phase_round_position_idx
  on matches(phase_id, round, position);
create index matches_group_id_idx on matches(group_id);

-- Every existing tournament becomes at least a one-phase tournament.
insert into tournament_phases (
  tournament_id,
  position,
  name,
  format,
  status,
  group_count,
  qualifiers_per_group
)
select
  id,
  1,
  case
    when format in ('round_robin', 'round_robin_elimination') then 'Fase a gironi'
    else 'Tabellone'
  end,
  case
    when format in ('round_robin', 'round_robin_elimination') then 'round_robin'
    else 'single_elimination'
  end,
  'active',
  case
    when format = 'round_robin_elimination' then greatest(coalesce(group_count, 1), 1)
    else 1
  end,
  case
    when format = 'round_robin_elimination' then qualifiers_per_group
    else null
  end
from tournaments;

insert into tournament_phases (
  tournament_id,
  position,
  name,
  format,
  status,
  group_count
)
select id, 2, 'Fase finale', 'single_elimination', 'pending', 1
from tournaments
where format = 'round_robin_elimination';

insert into tournament_groups (phase_id, position, name)
select
  phase.id,
  group_position,
  case
    when phase.group_count = 1 then 'Girone unico'
    else 'Girone ' || chr(64 + group_position)
  end
from tournament_phases phase
cross join lateral generate_series(1, phase.group_count) as group_position
where phase.format = 'round_robin';

insert into tournament_phase_players (phase_id, player_id, seed)
select phase.id, entry.player_id, entry.seed
from tournament_phases phase
join tournament_players entry on entry.tournament_id = phase.tournament_id
where phase.position = 1;

with ranked_players as (
  select
    phase_player.phase_id,
    phase_player.player_id,
    row_number() over (
      partition by phase_player.phase_id
      order by phase_player.seed nulls last, phase_player.player_id
    ) as player_position,
    phase.group_count
  from tournament_phase_players phase_player
  join tournament_phases phase on phase.id = phase_player.phase_id
  where phase.format = 'round_robin'
)
update tournament_phase_players phase_player
set group_id = tournament_group.id
from ranked_players ranked
join tournament_groups tournament_group
  on tournament_group.phase_id = ranked.phase_id
 and tournament_group.position = ((ranked.player_position - 1) % ranked.group_count) + 1
where phase_player.phase_id = ranked.phase_id
  and phase_player.player_id = ranked.player_id;

update matches match
set phase_id = phase.id
from tournament_phases phase
where phase.tournament_id = match.tournament_id
  and phase.position = 1;

alter table matches alter column phase_id set not null;

-- New tables are available through the backend API only. RLS remains enabled
-- as defence in depth and mirrors tournament visibility and admin ownership.
alter table tournament_phases enable row level security;
alter table tournament_groups enable row level security;
alter table tournament_phase_players enable row level security;

create policy "Users can read visible tournament phases"
  on tournament_phases for select to authenticated
  using (
    exists (
      select 1
      from tournaments tournament
      where tournament.id = tournament_id
        and (
          tournament.published = true
          or exists (
            select 1 from profiles
            where profiles.id = (select auth.uid())
              and profiles.role = 'admin'
          )
        )
    )
  );

create policy "Admins can manage tournament phases"
  on tournament_phases for all to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Users can read visible tournament groups"
  on tournament_groups for select to authenticated
  using (
    exists (
      select 1
      from tournament_phases phase
      join tournaments tournament on tournament.id = phase.tournament_id
      where phase.id = phase_id
        and (
          tournament.published = true
          or exists (
            select 1 from profiles
            where profiles.id = (select auth.uid())
              and profiles.role = 'admin'
          )
        )
    )
  );

create policy "Admins can manage tournament groups"
  on tournament_groups for all to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Users can read visible phase players"
  on tournament_phase_players for select to authenticated
  using (
    exists (
      select 1
      from tournament_phases phase
      join tournaments tournament on tournament.id = phase.tournament_id
      where phase.id = phase_id
        and (
          tournament.published = true
          or exists (
            select 1 from profiles
            where profiles.id = (select auth.uid())
              and profiles.role = 'admin'
          )
        )
    )
  );

create policy "Admins can manage phase players"
  on tournament_phase_players for all to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

revoke all on tournament_phases, tournament_groups, tournament_phase_players
  from anon, authenticated;
