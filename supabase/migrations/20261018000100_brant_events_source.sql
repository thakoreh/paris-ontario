-- Rollback (preferred): deactivate while preserving dependent records.
-- update public.official_sources set active = false, ingestion_enabled = false
-- where id = 'cbaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
-- Delete only after confirming no dependent notices or ingestion_runs exist:
-- delete from public.official_sources as source
-- where source.id = 'cbaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
--   and not exists (select 1 from public.notices where source_id = source.id)
--   and not exists (select 1 from public.ingestion_runs where source_id = source.id);

-- Registry only. Community aggregator; ingestion remains disabled. Not applied here.
insert into public.official_sources
(id, community_id, name, organization, source_type, url, feed_url,
 authority_level, ingestion_type, ingestion_enabled, refresh_interval_minutes,
 last_checked_at, active)
values
('cbaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '00000000-0000-4000-8000-000000000001',
 'Brant Events', 'Brant Events (community listings)', 'community',
 'https://brantevents.org/', 'https://brantevents.org/events.rss',
 'community_signal', 'rss', false, 360, null, true)
on conflict (id) do nothing;
