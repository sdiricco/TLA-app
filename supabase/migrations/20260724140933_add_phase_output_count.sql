alter table tournament_phases
  add column output_count integer;

update tournament_phases
set output_count = case
  when qualifiers_per_group is not null
    then group_count * qualifiers_per_group
  else 1
end;

alter table tournament_phases
  alter column output_count set not null,
  alter column output_count set default 1,
  add constraint tournament_phases_output_count_check check (output_count > 0);
