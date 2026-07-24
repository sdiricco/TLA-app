-- The original draw model allowed one match per tournament/round/position.
-- Multi-group phases reuse round and position inside each group, so uniqueness
-- must be scoped to the phase and, for round robins, to the group.
alter table matches
  drop constraint if exists matches_tournament_id_round_position_key;

create unique index matches_group_round_position_key
  on matches (phase_id, group_id, round, position)
  where group_id is not null;

create unique index matches_bracket_round_position_key
  on matches (phase_id, round, position)
  where group_id is null;
