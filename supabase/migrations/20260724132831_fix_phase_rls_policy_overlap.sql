drop policy if exists "Admins can manage tournament phases" on tournament_phases;
drop policy if exists "Admins can manage tournament groups" on tournament_groups;
drop policy if exists "Admins can manage phase players" on tournament_phase_players;

create policy "Admins can insert tournament phases"
  on tournament_phases for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Admins can update tournament phases"
  on tournament_phases for update to authenticated
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

create policy "Admins can delete tournament phases"
  on tournament_phases for delete to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Admins can insert tournament groups"
  on tournament_groups for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Admins can update tournament groups"
  on tournament_groups for update to authenticated
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

create policy "Admins can delete tournament groups"
  on tournament_groups for delete to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Admins can insert phase players"
  on tournament_phase_players for insert to authenticated
  with check (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Admins can update phase players"
  on tournament_phase_players for update to authenticated
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

create policy "Admins can delete phase players"
  on tournament_phase_players for delete to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );
