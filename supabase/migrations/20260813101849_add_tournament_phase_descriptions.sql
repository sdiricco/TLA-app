alter table tournament_phases
  add column description text not null default '';

update tournament_phases
set description = case format
  when 'round_robin' then 'Calendario, risultati e classifica della fase.'
  else 'Tabellone e incontri a eliminazione diretta della fase.'
end
where description = '';

alter table tournament_phases
  add constraint tournament_phases_description_length
  check (char_length(description) <= 240);
