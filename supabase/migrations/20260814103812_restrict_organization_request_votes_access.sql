-- Organization request votes are managed by the backend only.
alter table public.organization_request_votes enable row level security;

revoke all on table public.organization_request_votes from anon, authenticated;
