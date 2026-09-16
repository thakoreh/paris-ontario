-- Community foundations deliberately expose only a read-only public projection.
-- Browser writes will be introduced through reviewed, rate-limited server endpoints.

create table public.community_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  display_name text not null check (
    char_length(display_name) between 3 and 40
    and display_name ~ '^[A-Za-z0-9][A-Za-z0-9 ._-]*[A-Za-z0-9]$'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_threads (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 8 and 140),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden','deleted')),
  is_locked boolean not null default false,
  moderated_at timestamptz,
  moderated_by uuid references public.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status in ('approved','rejected','hidden') and moderated_at is not null)
    or status in ('pending','deleted')
  )
);

create index community_threads_public_feed_idx
  on public.community_threads(community_id, created_at desc)
  where status = 'approved' and deleted_at is null;
create index community_threads_author_idx on public.community_threads(author_id, created_at desc);

alter table public.community_profiles enable row level security;
alter table public.community_threads enable row level security;

-- The underlying tables include account-linked identifiers and moderation state.
-- Do not let browser roles query or mutate them directly.
revoke all on public.community_profiles from public, anon, authenticated;
revoke all on public.community_threads from public, anon, authenticated;
grant all on public.community_profiles, public.community_threads to service_role;

create view public.community_threads_public as
select
  thread.id,
  thread.community_id,
  profile.id as profile_id,
  profile.display_name,
  thread.title,
  thread.body,
  thread.is_locked,
  thread.created_at,
  thread.updated_at
from public.community_threads thread
join public.community_profiles profile on profile.user_id = thread.author_id
where thread.status = 'approved'
  and thread.deleted_at is null;

revoke all on public.community_threads_public from public;
grant select on public.community_threads_public to anon, authenticated;
