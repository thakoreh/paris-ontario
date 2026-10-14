-- Correct only the audited broken URL; reruns and independently edited records are untouched.
update public.notices
set official_url = 'https://www.parisfairgrounds.com/events'
where id = 'ca888888-8888-4888-8888-888888888888'
  and slug = 'paris-night-market-fall-fest'
  and official_url = 'https://www.parisfairgrounds.com/events/paris-night-market---day-2';

update public.deadlines
set official_url = 'https://www.parisfairgrounds.com/events'
where id = 'da333333-3333-4333-8333-333333333333'
  and notice_id = 'ca888888-8888-4888-8888-888888888888'
  and official_url = 'https://www.parisfairgrounds.com/events/paris-night-market---day-2';
