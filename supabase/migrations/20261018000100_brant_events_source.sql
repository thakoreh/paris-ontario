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
