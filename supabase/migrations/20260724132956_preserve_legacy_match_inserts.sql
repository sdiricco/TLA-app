create or replace function assign_match_active_phase()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.phase_id is null then
    select phase.id
    into new.phase_id
    from tournament_phases phase
    where phase.tournament_id = new.tournament_id
    order by
      case phase.status
        when 'active' then 0
        when 'pending' then 1
        else 2
      end,
      phase.position
    limit 1;
  end if;

  if new.phase_id is null then
    raise exception 'No tournament phase found for tournament %', new.tournament_id;
  end if;

  return new;
end;
$$;

drop trigger if exists matches_assign_active_phase on matches;
create trigger matches_assign_active_phase
  before insert or update of tournament_id, phase_id on matches
  for each row execute function assign_match_active_phase();

revoke execute on function assign_match_active_phase() from public, anon, authenticated;
