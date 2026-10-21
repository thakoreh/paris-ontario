-- Rollback: restore the previous 60-minute budget for the same id+name rows.
-- Caveat: an unguarded rollback overwrites later manual interval edits.
-- The interval guard below preserves later editorial changes.
-- update public.official_sources as source
-- set refresh_interval_minutes = 60
-- from (values
--   ('cb111111-1111-4111-8111-111111111111'::uuid, 'County of Brant News', 360),
--   ('cb222222-2222-4222-8222-222222222222'::uuid, 'County of Brant Culture Days', 10080),
--   ('cb333333-3333-4333-8333-333333333333'::uuid, 'County of Brant Elections', 10080),
--   ('cb444444-4444-4444-8444-444444444444'::uuid, 'County of Brant Public Library', 10080),
--   ('cb555555-5555-4555-8555-555555555555'::uuid, 'Paris Agricultural Society', 10080),
--   ('cb666666-6666-4666-8666-666666666666'::uuid, 'Flood messages', 10080),
--   ('cb777777-7777-4777-8777-777777777777'::uuid, 'Municipal511', 10080),
--   ('cb888888-8888-4888-8888-888888888888'::uuid, 'GrandBridge outage map', 10080),
--   ('cb999999-9999-4999-8999-999999999999'::uuid, 'Brant Transit', 10080)
-- ) as original(id, name, minutes)
-- where source.id = original.id and source.name = original.name
--   and source.refresh_interval_minutes = original.minutes;

-- Review budgets only: preserve recorded checks and the existing >= 15 minute constraint.
-- Match both id and name so unrelated or renamed sources are not changed. Safe to rerun.
update public.official_sources as source
set refresh_interval_minutes = budget.minutes
from (values
  -- Automated news: four-hour scheduler cadence plus two hours of grace.
  ('cb111111-1111-4111-8111-111111111111'::uuid, 'County of Brant News', 360),
  -- Manually reviewed seasonal event hub: weekly review.
  ('cb222222-2222-4222-8222-222222222222'::uuid, 'County of Brant Culture Days', 10080),
  -- Manually reviewed election information: weekly, including election season.
  ('cb333333-3333-4333-8333-333333333333'::uuid, 'County of Brant Elections', 10080),
  -- Published library hours and holiday closures: weekly manual review.
  ('cb444444-4444-4444-8444-444444444444'::uuid, 'County of Brant Public Library', 10080),
  -- Fairgrounds event listings: weekly manual review.
  ('cb555555-5555-4555-8555-555555555555'::uuid, 'Paris Agricultural Society', 10080),
  -- External flood-message link, not ingested: weekly link review, not live-condition monitoring.
  ('cb666666-6666-4666-8666-666666666666'::uuid, 'Flood messages', 10080),
  -- External live road map, not ingested: weekly link review, not a traffic freshness guarantee.
  ('cb777777-7777-4777-8777-777777777777'::uuid, 'Municipal511', 10080),
  -- External live outage map, not ingested: weekly link review, not outage monitoring.
  ('cb888888-8888-4888-8888-888888888888'::uuid, 'GrandBridge outage map', 10080),
  -- Transit service reference: weekly manual review for schedule and fare changes.
  ('cb999999-9999-4999-8999-999999999999'::uuid, 'Brant Transit', 10080)
) as budget(id, name, minutes)
where source.id = budget.id
  and source.name = budget.name
  and budget.minutes >= 15;
