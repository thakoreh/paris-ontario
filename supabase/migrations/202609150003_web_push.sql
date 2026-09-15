-- Opt-in browser push subscriptions and a service-role delivery ledger.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
create policy push_subscriptions_owner on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notice_id, subscription_id)
);

create index push_deliveries_notice_status_idx on public.push_deliveries(notice_id, status);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from public, anon, authenticated;
grant all on public.push_deliveries to service_role;
