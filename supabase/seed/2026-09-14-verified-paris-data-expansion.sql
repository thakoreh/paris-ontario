-- Verified Paris Pulse expansion. Sources checked on 2026-09-14.
-- Every notice and date below has a direct, public source URL; no sample rows are inserted.
begin;

insert into public.official_sources (
  id, community_id, name, organization, source_type, url, description,
  authority_level, ingestion_type, ingestion_enabled, refresh_interval_minutes,
  last_checked_at, last_success_at, active
) values
(
  'cb222222-2222-4222-8222-222222222222',
  '00000000-0000-4000-8000-000000000001',
  'County of Brant Culture Days',
  'County of Brant',
  'website',
  'https://www.brant.ca/visit-and-discover-brant/arts-culture-and-heritage/culture-days/',
  'Official County of Brant Culture Days hub and Paris-area event listings.',
  'official', 'manual', false, 60, now(), now(), true
),
(
  'cb333333-3333-4333-8333-333333333333',
  '00000000-0000-4000-8000-000000000001',
  'County of Brant Elections',
  'County of Brant',
  'website',
  'https://www.brant.ca/council-and-county-administration/elections/',
  'Official 2026 County of Brant municipal and school board election information.',
  'official', 'manual', false, 60, now(), now(), true
),
(
  'cb444444-4444-4444-8444-444444444444',
  '00000000-0000-4000-8000-000000000001',
  'County of Brant Public Library',
  'County of Brant Public Library',
  'website',
  'https://www.brantlibrary.ca/en/your-library/hours-and-locations.aspx',
  'Official Paris Branch hours, location, and 2026 holiday-closure schedule.',
  'official_agency', 'manual', false, 60, now(), now(), true
),
(
  'cb555555-5555-4555-8555-555555555555',
  '00000000-0000-4000-8000-000000000001',
  'Paris Agricultural Society',
  'Paris Agricultural Society',
  'website',
  'https://www.parisfairgrounds.com/events/paris-night-market---day-2',
  'Official Paris Fairgrounds events, including community market listings.',
  'trusted_local_org', 'manual', false, 60, now(), now(), true
),
(
  'cb666666-6666-4666-8666-666666666666',
  '00000000-0000-4000-8000-000000000001',
  'Flood messages',
  'Grand River Conservation Authority',
  'website',
  'https://www.grandriver.ca/news/flood-messages/',
  'Official Grand River watershed flood-message feed.',
  'official_agency', 'manual', false, 60, now(), now(), true
),
(
  'cb777777-7777-4777-8777-777777777777',
  '00000000-0000-4000-8000-000000000001',
  'Municipal511',
  'Municipal511',
  'website',
  'https://www.municipal511.ca/',
  'Official municipal road-closure and construction map.',
  'official_agency', 'manual', false, 60, now(), now(), true
),
(
  'cb888888-8888-4888-8888-888888888888',
  '00000000-0000-4000-8000-000000000001',
  'GrandBridge outage map',
  'GrandBridge Energy',
  'website',
  'https://grandbridgeenergy.com/outages/',
  'Official GrandBridge Energy outage information.',
  'official_agency', 'manual', false, 60, now(), now(), true
),
(
  'cb999999-9999-4999-8999-999999999999',
  '00000000-0000-4000-8000-000000000001',
  'Brant Transit',
  'County of Brant',
  'website',
  'https://www.brant.ca/roads-parking-and-public-transit/brant-transit/',
  'Official County of Brant transit service information.',
  'official', 'manual', false, 60, now(), now(), true
)
on conflict (id) do update set
  name = excluded.name,
  organization = excluded.organization,
  source_type = excluded.source_type,
  url = excluded.url,
  description = excluded.description,
  authority_level = excluded.authority_level,
  ingestion_type = excluded.ingestion_type,
  ingestion_enabled = excluded.ingestion_enabled,
  refresh_interval_minutes = excluded.refresh_interval_minutes,
  last_checked_at = excluded.last_checked_at,
  last_success_at = excluded.last_success_at,
  active = excluded.active,
  updated_at = now();

insert into public.notices (
  id, community_id, source_id, external_id, title, slug, summary, body, category,
  severity, official_url, published_at, source_updated_at, retrieved_at, verified_at,
  start_at, end_at, expires_at, address_text, latitude, longitude, affected_area_text,
  city, tags_json, verification_status, confidence_score, is_sample
) values
(
  'ca555555-5555-4555-8555-555555555555',
  '00000000-0000-4000-8000-000000000001',
  'cb333333-3333-4333-8333-333333333333',
  '2026-voter-registration-mailing-deadline',
  'Voter-list registration deadline is September 15',
  'voter-list-registration-deadline-september-15',
  'Register by September 15 to receive a Voter Notification Letter in the mail for the October 26 County of Brant municipal and school board election.',
  'Official County of Brant election information. Residents can check their voter-registration status through the official voter-registration service.',
  'public_notice', 'important',
  'https://www.brant.ca/council-and-county-administration/elections/',
  '2026-09-14T12:00:00-04:00', '2026-09-14T12:00:00-04:00', now(), now(),
  null, '2026-09-15T23:59:59-04:00', '2026-09-15T23:59:59-04:00',
  'County of Brant', null, null, 'County of Brant', 'Paris',
  '["election", "voter-registration", "deadline"]'::jsonb, 'verified', 1, false
),
(
  'ca666666-6666-4666-8666-666666666666',
  '00000000-0000-4000-8000-000000000001',
  'cb111111-1111-4111-8111-111111111111',
  'accessibility-advisory-committee-open-house-2026',
  'Accessibility Advisory Committee Open House',
  'accessibility-advisory-committee-open-house',
  'County of Brant’s Accessibility Advisory Committee is holding an open house on Tuesday, September 22 from noon to 2 p.m. at Council Chambers in Paris. RSVP requests can include accommodation needs.',
  'Official County of Brant notice. The open house recognizes the 2022–2026 committee’s work and introduces the committee to residents, caregivers, and people living with ability challenges.',
  'event', 'useful',
  'https://www.brant.ca/news/posts/join-the-accessibility-advisory-committee-for-an-open-house/',
  '2026-08-14T12:00:00-04:00', '2026-08-14T12:00:00-04:00', now(), now(),
  '2026-09-22T12:00:00-04:00', '2026-09-22T14:00:00-04:00', '2026-09-22T14:00:00-04:00',
  'County of Brant Council Chambers, 7 Broadway Street West', 43.192664, -80.3849894,
  'Council Chambers, downtown Paris', 'Paris',
  '["accessibility", "community", "open-house"]'::jsonb, 'verified', 1, false
),
(
  'ca777777-7777-4777-8777-777777777777',
  '00000000-0000-4000-8000-000000000001',
  'cb222222-2222-4222-8222-222222222222',
  'county-of-brant-culture-days-2026',
  'Culture Days begins September 18',
  'culture-days-begins-september-18',
  'County of Brant Culture Days runs from September 18 to October 4, with multiple arts, culture, and heritage activities listed in Paris.',
  'Official County of Brant Culture Days hub. The schedule includes Paris-area workshops, exhibitions, and walking tours; each listing should be checked for its specific time and location.',
  'event', 'useful',
  'https://www.brant.ca/visit-and-discover-brant/arts-culture-and-heritage/culture-days/',
  '2026-09-14T12:00:00-04:00', '2026-09-14T12:00:00-04:00', now(), now(),
  '2026-09-18T00:00:00-04:00', '2026-10-04T23:59:59-04:00', '2026-10-05T00:00:00-04:00',
  'Multiple venues', null, null, 'Paris and County of Brant', 'Paris',
  '["culture-days", "arts", "heritage"]'::jsonb, 'verified', 1, false
),
(
  'ca888888-8888-4888-8888-888888888888',
  '00000000-0000-4000-8000-000000000001',
  'cb555555-5555-4555-8555-555555555555',
  'paris-night-market-fall-fest-2026',
  'Paris Night Market & Fall Fest',
  'paris-night-market-fall-fest',
  'The 11th annual Paris Night Market & Fall Fest runs September 18 from 5 to 10 p.m. and September 19 from 4 to 10 p.m. at the Paris Fairgrounds.',
  'Official Paris Agricultural Society event listing. The event includes artisans, food trucks, entertainment, an outdoor movie on Saturday, and gate admission paid in cash.',
  'event', 'useful',
  'https://www.parisfairgrounds.com/events/paris-night-market---day-2',
  '2026-09-14T12:00:00-04:00', '2026-09-14T12:00:00-04:00', now(), now(),
  '2026-09-18T17:00:00-04:00', '2026-09-19T22:00:00-04:00', '2026-09-19T22:00:00-04:00',
  'Paris Fairgrounds, 139 Silver Street', 43.2045471, -80.407974,
  'Paris Fairgrounds', 'Paris',
  '["night-market", "fall-fest", "family"]'::jsonb, 'verified', 1, false
),
(
  'ca999999-9999-4999-8999-999999999999',
  '00000000-0000-4000-8000-000000000001',
  'cb444444-4444-4444-8444-444444444444',
  'paris-library-truth-reconciliation-closure-2026',
  'Paris Branch Library closed September 30',
  'paris-library-closed-september-30',
  'The County of Brant Public Library’s Paris Branch will be closed Wednesday, September 30 for the National Day for Truth and Reconciliation.',
  'Official County of Brant Public Library 2026 holiday-closure schedule. The Paris Branch is at 12 William Street; its return bin remains available outside regular hours.',
  'facility', 'important',
  'https://www.brantlibrary.ca/en/your-library/hours-and-locations.aspx',
  '2026-09-14T12:00:00-04:00', '2026-09-14T12:00:00-04:00', now(), now(),
  '2026-09-30T00:00:00-04:00', '2026-09-30T23:59:59-04:00', '2026-10-01T00:00:00-04:00',
  'County of Brant Public Library - Paris Branch, 12 William Street', 43.1937317, -80.3860678,
  'Paris Branch Library', 'Paris',
  '["library", "closure", "holiday-hours"]'::jsonb, 'verified', 1, false
),
(
  'caaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '00000000-0000-4000-8000-000000000001',
  'cb222222-2222-4222-8222-222222222222',
  'culture-days-arabic-calligraphy-workshop-2026',
  'Arabic Calligraphy hands-on workshop',
  'arabic-calligraphy-hands-on-workshop',
  'The Art of Arabic Calligraphy hands-on workshop is scheduled for Saturday, September 19 from 3 to 5 p.m. at the Islamic Centre of Brant in Paris.',
  'Culture Days listing connected to the County of Brant Culture Days Hub. Confirm participation details with the original event listing before attending.',
  'event', 'useful',
  'https://culturedays.ca/en/events/b43a2522-d9dc-491d-a48a-9dee66fc9b47',
  '2026-09-14T12:00:00-04:00', '2026-09-14T12:00:00-04:00', now(), now(),
  '2026-09-19T15:00:00-04:00', '2026-09-19T17:00:00-04:00', '2026-09-19T17:00:00-04:00',
  'Islamic Centre of Brant, 143 King Edward Street', null, null,
  'Islamic Centre of Brant', 'Paris',
  '["culture-days", "workshop", "arts"]'::jsonb, 'verified', 1, false
),
(
  'cabbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '00000000-0000-4000-8000-000000000001',
  'cb222222-2222-4222-8222-222222222222',
  'culture-days-audiobook-narration-101-2026',
  'Audiobook Narration 101',
  'audiobook-narration-101',
  'Audiobook Narration 101 is scheduled for Tuesday, September 22 from 6:30 to 9 p.m. at Rebel & Royal in Paris.',
  'Culture Days listing connected to the County of Brant Culture Days Hub. Confirm participation details with the original event listing before attending.',
  'event', 'useful',
  'https://culturedays.ca/en/events/403a6f1e-201e-475a-8004-41fd1e8b9ac0',
  '2026-09-14T12:00:00-04:00', '2026-09-14T12:00:00-04:00', now(), now(),
  '2026-09-22T18:30:00-04:00', '2026-09-22T21:00:00-04:00', '2026-09-22T21:00:00-04:00',
  'Rebel & Royal, 119 Grand River Street', null, null,
  'Rebel & Royal', 'Paris',
  '["culture-days", "workshop", "audiobooks"]'::jsonb, 'verified', 1, false
)
on conflict (slug) do update set
  source_id = excluded.source_id,
  external_id = excluded.external_id,
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  category = excluded.category,
  severity = excluded.severity,
  official_url = excluded.official_url,
  published_at = excluded.published_at,
  source_updated_at = excluded.source_updated_at,
  retrieved_at = excluded.retrieved_at,
  verified_at = excluded.verified_at,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  expires_at = excluded.expires_at,
  address_text = excluded.address_text,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  affected_area_text = excluded.affected_area_text,
  city = excluded.city,
  tags_json = excluded.tags_json,
  verification_status = 'verified',
  confidence_score = excluded.confidence_score,
  is_sample = false,
  updated_at = now();

insert into public.deadlines (
  id, notice_id, community_id, title, description, category, starts_at,
  deadline_at, official_url, latitude, longitude, source_id, verified_at, is_sample
) values
(
  'da111111-1111-4111-8111-111111111111',
  'ca555555-5555-4555-8555-555555555555',
  '00000000-0000-4000-8000-000000000001',
  'Voter Notification Letter mailing deadline',
  'Register by September 15 to receive a Voter Notification Letter in the mail for the October 26 County of Brant election.',
  'public_notice', null, '2026-09-15T23:59:59-04:00',
  'https://www.brant.ca/council-and-county-administration/elections/',
  null, null, 'cb333333-3333-4333-8333-333333333333', now(), false
),
(
  'da222222-2222-4222-8222-222222222222',
  'ca777777-7777-4777-8777-777777777777',
  '00000000-0000-4000-8000-000000000001',
  'Culture Days begins',
  'The County of Brant Culture Days program begins September 18 and continues through October 4.',
  'event', '2026-09-18T00:00:00-04:00', '2026-09-18T00:00:00-04:00',
  'https://www.brant.ca/visit-and-discover-brant/arts-culture-and-heritage/culture-days/',
  null, null, 'cb222222-2222-4222-8222-222222222222', now(), false
),
(
  'da333333-3333-4333-8333-333333333333',
  'ca888888-8888-4888-8888-888888888888',
  '00000000-0000-4000-8000-000000000001',
  'Paris Night Market opens',
  'The Paris Night Market & Fall Fest opens at 5 p.m. on September 18 at the Paris Fairgrounds.',
  'event', '2026-09-18T17:00:00-04:00', '2026-09-18T17:00:00-04:00',
  'https://www.parisfairgrounds.com/events/paris-night-market---day-2',
  43.2045471, -80.407974, 'cb555555-5555-4555-8555-555555555555', now(), false
)
on conflict (id) do update set
  notice_id = excluded.notice_id,
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  starts_at = excluded.starts_at,
  deadline_at = excluded.deadline_at,
  official_url = excluded.official_url,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  source_id = excluded.source_id,
  verified_at = excluded.verified_at,
  is_sample = false;

commit;
