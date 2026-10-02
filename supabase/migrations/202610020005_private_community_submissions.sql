-- Anonymous updates are evidence for editorial review, never public content.
-- There is intentionally no public view, publishing trigger, or notification hook.
create table public.community_submissions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id),
  title text not null check (
    title = btrim(title) and char_length(title) between 8 and 140
    and title !~ '[[:cntrl:]]'
  ),
  body text not null check (body = btrim(body) and char_length(body) between 20 and 2000),
  category text not null check (category in (
    'roads', 'construction', 'planning', 'recreation', 'facility', 'event',
    'transit', 'downtown', 'public_notice', 'waste', 'storm', 'outage', 'other'
  )),
  area text not null check (area in (
    'all-paris', 'downtown', 'north-paris', 'south-paris', 'east-paris', 'west-paris'
  )),
  -- The server also validates a public HTTPS host and rejects credentials/local IPs.
  -- This constraint is the database's minimum shape/size boundary, not a URL parser.
  source_url text not null check (
    source_url = btrim(source_url) and char_length(source_url) between 10 and 2048
    and source_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
  ),
  status text not null default 'pending' check (status in ('pending', 'ready', 'rejected')),
  review_notes text check (
    review_notes = btrim(review_notes) and char_length(review_notes) between 10 and 2000
  ),
  review_checks jsonb not null default '{}'::jsonb check (
    jsonb_typeof(review_checks) = 'object'
    and review_checks - array['source_verified', 'geography_verified', 'facts_verified', 'privacy_checked'] = '{}'::jsonb
    and (review_checks -> 'source_verified' is null or jsonb_typeof(review_checks -> 'source_verified') = 'boolean')
    and (review_checks -> 'geography_verified' is null or jsonb_typeof(review_checks -> 'geography_verified') = 'boolean')
    and (review_checks -> 'facts_verified' is null or jsonb_typeof(review_checks -> 'facts_verified') = 'boolean')
    and (review_checks -> 'privacy_checked' is null or jsonb_typeof(review_checks -> 'privacy_checked') = 'boolean')
  ),
  moderated_at timestamptz,
  -- Preserve reviewer attribution; removing a reviewer needs a reviewed retention plan.
  moderated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint community_submissions_review_required check (
    (
      status = 'pending' and moderated_at is null and moderated_by is null
      and review_notes is null and review_checks = '{}'::jsonb
    ) or (
      status in ('ready', 'rejected') and moderated_at is not null
      and moderated_at >= created_at and moderated_by is not null and review_notes is not null
      and (status = 'rejected' or review_checks = '{"source_verified":true,"geography_verified":true,"facts_verified":true,"privacy_checked":true}'::jsonb)
    )
  )
);

comment on table public.community_submissions is
  'Private unverified intake. Ready means editorial handoff only; it does not publish, create a community thread, or send any alert.';

create index community_submissions_review_queue_idx
  on public.community_submissions (community_id, status, created_at desc);

-- Only a keyed, deployment-specific hash reaches this table; never an IP address.
-- Fixed UTC windows are intentional: 3 per client/hour, 10 per client/day,
-- and 100 globally/hour. The global budget spans all communities and clients.
create table public.community_submission_rate_limits (
  scope text not null check (scope in ('client_hour', 'client_day', 'global_hour')),
  client_hash text not null,
  window_start timestamptz not null,
  submissions integer not null check (submissions > 0),
  primary key (scope, client_hash, window_start),
  check (
    (scope = 'global_hour' and client_hash = '' and submissions <= 100)
    or (scope = 'client_hour' and client_hash ~ '^[a-f0-9]{64}$' and submissions <= 3)
    or (scope = 'client_day' and client_hash ~ '^[a-f0-9]{64}$' and submissions <= 10)
  ),
  check (
    (scope = 'client_day' and window_start at time zone 'UTC' = date_trunc('day', window_start at time zone 'UTC'))
    or (scope <> 'client_day' and window_start at time zone 'UTC' = date_trunc('hour', window_start at time zone 'UTC'))
  )
);

create index community_submission_rate_limits_window_idx
  on public.community_submission_rate_limits (window_start);

-- Only expired abuse-counter windows are cleaned up by intake (48h retention).
-- Private submissions are never deleted here; approve a separate retention policy
-- and an editor staffing/response process before enabling intake.
alter table public.community_submissions enable row level security;
alter table public.community_submission_rate_limits enable row level security;

-- Supabase can have permissive default grants: remove them explicitly.
-- No browser policies exist, even for signed-in editors. Review uses the server.
revoke all on public.community_submissions from public, anon, authenticated, service_role;
revoke all on public.community_submission_rate_limits from public, anon, authenticated, service_role;
grant select, insert, update on public.community_submissions to service_role;
grant select, insert, update, delete on public.community_submission_rate_limits to service_role;

create function public.submit_community_update(
  p_community_id uuid,
  p_client_hash text,
  p_title text,
  p_body text,
  p_category text,
  p_area text,
  p_source_url text
)
returns table (submission_id uuid, rate_limited boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_time_utc timestamptz;
  hour_start timestamptz;
  day_start timestamptz;
  client_hour_count integer;
  client_day_count integer;
  global_hour_count integer;
  inserted_id uuid;
begin
  if p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'A keyed client hash is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.communities
    where id = p_community_id and slug = 'paris-ontario' and active = true
  ) then
    raise exception 'Intake community is not available' using errcode = '22023';
  end if;

  -- A single namespaced transaction lock serializes the global and client budgets
  -- together. Read counters only after obtaining it, then insert and count in the
  -- same transaction. A failed insert or caller rollback also rolls back counters.
  perform pg_catalog.pg_advisory_xact_lock(1347433557, 1);
  current_time_utc := pg_catalog.clock_timestamp();
  hour_start := pg_catalog.date_trunc('hour', current_time_utc at time zone 'UTC') at time zone 'UTC';
  day_start := pg_catalog.date_trunc('day', current_time_utc at time zone 'UTC') at time zone 'UTC';

  -- Bound storage and per-call cleanup work. This only removes counters whose
  -- hour/day windows cannot affect any current limit, never community content.
  delete from public.community_submission_rate_limits
  where (scope, client_hash, window_start) in (
    select scope, client_hash, window_start
    from public.community_submission_rate_limits
    where window_start < current_time_utc - interval '48 hours'
    order by window_start limit 256
  );

  select
    coalesce(max(submissions) filter (where scope = 'client_hour'), 0),
    coalesce(max(submissions) filter (where scope = 'client_day'), 0),
    coalesce(max(submissions) filter (where scope = 'global_hour'), 0)
  into client_hour_count, client_day_count, global_hour_count
  from public.community_submission_rate_limits
  where (scope = 'client_hour' and client_hash = p_client_hash and window_start = hour_start)
    or (scope = 'client_day' and client_hash = p_client_hash and window_start = day_start)
    or (scope = 'global_hour' and client_hash = '' and window_start = hour_start);

  if client_hour_count >= 3 or client_day_count >= 10 or global_hour_count >= 100 then
    return query select null::uuid, true;
    return;
  end if;

  insert into public.community_submissions (community_id, title, body, category, area, source_url)
  values (p_community_id, p_title, p_body, p_category, p_area, p_source_url)
  returning id into inserted_id;

  insert into public.community_submission_rate_limits as limits (scope, client_hash, window_start, submissions)
  values
    ('client_hour', p_client_hash, hour_start, 1),
    ('client_day', p_client_hash, day_start, 1),
    ('global_hour', '', hour_start, 1)
  on conflict (scope, client_hash, window_start)
  do update set submissions = limits.submissions + 1;

  return query select inserted_id, false;
end;
$$;

-- PostgreSQL functions default to PUBLIC execute, so revoke it in the same migration.
revoke all on function public.submit_community_update(uuid, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_community_update(uuid, text, text, text, text, text, text)
  to service_role;

comment on function public.submit_community_update(uuid, text, text, text, text, text, text) is
  'Server-only atomic intake. Returns one row: an ID with rate_limited=false, or null with rate_limited=true. Fixed UTC hour/day limits; never publishes.';


-- Protect the review lifecycle even if a future server caller omits a filter.
-- Private review state is terminal; publishing would require a separate reviewed
-- implementation, and is deliberately not part of this table or API.
create function public.guard_community_submission_review()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.status <> 'pending' then
      raise exception 'New submissions must await editorial review' using errcode = '23514';
    end if;
    return NEW;
  end if;
  if OLD.status <> 'pending' or NEW.status not in ('ready', 'rejected') then
    raise exception 'Only pending submissions can be reviewed' using errcode = '23514';
  end if;
  if row(NEW.id, NEW.community_id, NEW.title, NEW.body, NEW.category, NEW.area, NEW.source_url, NEW.created_at)
     is distinct from row(OLD.id, OLD.community_id, OLD.title, OLD.body, OLD.category, OLD.area, OLD.source_url, OLD.created_at) then
    raise exception 'Intake evidence is immutable' using errcode = '23514';
  end if;
  if not exists (select 1 from public.users where id = NEW.moderated_by and role in ('editor', 'admin')) then
    raise exception 'A current editor must review the submission' using errcode = '23514';
  end if;
  return NEW;
end;
$$;
revoke all on function public.guard_community_submission_review() from public, anon, authenticated, service_role;
create trigger guard_community_submission_review
before insert or update on public.community_submissions
for each row execute function public.guard_community_submission_review();

create function public.community_submission_intake_ready(p_community_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.communities
    where id = p_community_id and slug = 'paris-ontario' and active = true
  )
  and pg_catalog.has_table_privilege(current_user, 'public.community_submissions', 'SELECT')
  and pg_catalog.has_table_privilege(current_user, 'public.community_submissions', 'INSERT')
  and pg_catalog.has_table_privilege(current_user, 'public.community_submission_rate_limits', 'SELECT')
  and pg_catalog.has_table_privilege(current_user, 'public.community_submission_rate_limits', 'INSERT')
  and pg_catalog.has_table_privilege(current_user, 'public.community_submission_rate_limits', 'UPDATE')
  and pg_catalog.has_table_privilege(current_user, 'public.community_submission_rate_limits', 'DELETE')
  and pg_catalog.has_function_privilege(current_user, 'public.submit_community_update(uuid,text,text,text,text,text,text)', 'EXECUTE');
$$;
revoke all on function public.community_submission_intake_ready(uuid) from public, anon, authenticated, service_role;
grant execute on function public.community_submission_intake_ready(uuid) to service_role;
