create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invitee_profile_id uuid not null references public.profiles(id) on delete cascade,
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  read_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_email_normalized
    check (email = lower(btrim(email))),
  constraint organization_invitations_organization_invitee_key
    unique (organization_id, invitee_profile_id)
);

create index organization_invitations_invitee_status_created_idx
  on public.organization_invitations(invitee_profile_id, status, created_at desc);

create index organization_invitations_organization_status_idx
  on public.organization_invitations(organization_id, status);

create index organization_invitations_invited_by_profile_id_idx
  on public.organization_invitations(invited_by_profile_id);

create trigger organization_invitations_updated_at
  before update on public.organization_invitations
  for each row execute function public.update_updated_at();

-- Invitations are served by the authorized Express API. They must never be
-- enumerable from the browser through the public Supabase Data API.
alter table public.organization_invitations enable row level security;
revoke all on table public.organization_invitations from anon, authenticated;
