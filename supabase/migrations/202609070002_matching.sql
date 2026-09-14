-- Internal matching function: never callable directly by browser roles.
create function public.rebuild_user_matches(target_user uuid) returns integer language plpgsql security definer set search_path=public as $$
declare n record; loc record; pref record; dist double precision; score integer; reasons jsonb; matched integer:=0; interest_match boolean; selected_location uuid;
begin
 update user_notice_matches set relevance_score=0,match_reasons_json='[]' where user_id=target_user;
 select * into pref from alert_preferences where user_id=target_user and location_id is null limit 1;
 for n in select * from notices where verification_status='verified' and (expires_at is null or expires_at>now()) and (end_at is null or end_at>now()) loop
  selected_location:=null; dist:=null; score:=10; reasons:='[]';
  if n.latitude is not null and n.longitude is not null then
   select l.*,6371*2*asin(sqrt(least(1,power(sin(radians(n.latitude-l.latitude)/2),2)+cos(radians(l.latitude))*cos(radians(n.latitude))*power(sin(radians(n.longitude-l.longitude)/2),2)))) as distance into loc from locations l where user_id=target_user and community_id=n.community_id order by distance limit 1;
   dist:=loc.distance; selected_location:=loc.id;
   if dist is not null and coalesce(pref.radius_km,3)>0 and dist>coalesce(pref.radius_km,3)+coalesce(n.affected_radius_km,0) then continue; end if;
   if dist is not null then score:=(case when dist<.5 then 50 when dist<1 then 40 when dist<3 then 30 when dist<5 then 20 else 10 end)+20;reasons:=reasons||jsonb_build_array(round(dist::numeric,2)::text||' km from '||loc.label);end if;
  else
   if not exists(select 1 from locations where user_id=target_user and community_id=n.community_id and lower(city)=lower(n.city)) then continue; end if;
   reasons:=reasons||jsonb_build_array('Affects all of '||n.city);
  end if;
  if not exists(select 1 from locations where user_id=target_user and community_id=n.community_id) then continue; end if;
  if array_position(array['info','useful','important','urgent'],n.severity)<array_position(array['info','useful','important','urgent'],coalesce(pref.minimum_severity,'info')) then continue; end if;
  interest_match:=coalesce(pref.categories_json,'["roads","construction","planning","recreation","storm","outage","emergency"]'::jsonb) ? n.category;
  if interest_match then score:=score+25;reasons:=reasons||jsonb_build_array('Matches '||n.category);end if;
  score:=score+case when n.severity='urgent' then 30 when n.severity='important' then 20 else 0 end;
  if coalesce(n.source_updated_at,n.published_at) between now()-interval '2 hours' and now() then score:=score+10;reasons:=reasons||jsonb_build_array('Updated within the last 2 hours');end if;
  score:=score+coalesce((select max(case when deadline_at<=now()+interval '24 hours' then 20 when deadline_at<=now()+interval '7 days' then 10 else 0 end) from deadlines where notice_id=n.id and deadline_at>now()),0);
  insert into user_notice_matches(user_id,notice_id,location_id,relevance_score,distance_km,match_reasons_json) values(target_user,n.id,selected_location,least(100,score),dist,reasons) on conflict(user_id,notice_id) do update set location_id=excluded.location_id,relevance_score=excluded.relevance_score,distance_km=excluded.distance_km,match_reasons_json=excluded.match_reasons_json;
  matched:=matched+1;
 end loop;
 return matched;
end $$;
revoke all on function public.rebuild_user_matches(uuid) from public,anon,authenticated;
create function public.refresh_my_matches() returns integer language plpgsql security definer set search_path=public as $$ begin if auth.uid() is null then raise exception 'Authentication required';end if;return public.rebuild_user_matches(auth.uid());end $$;
revoke all on function public.refresh_my_matches() from public,anon;
grant execute on function public.refresh_my_matches() to authenticated;
create function public.notice_matches_changed() returns trigger language plpgsql security definer set search_path=public as $$ declare u record;begin for u in select distinct user_id from locations where community_id=new.community_id loop perform public.rebuild_user_matches(u.user_id);end loop;return new;end $$;
create trigger generate_notice_matches after insert or update on notices for each row execute procedure public.notice_matches_changed();
create function public.private_matching_changed() returns trigger language plpgsql security definer set search_path=public as $$ begin if TG_OP='DELETE' then perform public.rebuild_user_matches(old.user_id);return old;end if;perform public.rebuild_user_matches(new.user_id);return new;end $$;
create trigger location_matches after insert or update or delete on locations for each row execute procedure public.private_matching_changed();
create trigger preference_matches after insert or update on alert_preferences for each row execute procedure public.private_matching_changed();
create function public.notice_match_count(target_notice uuid) returns bigint language plpgsql security definer set search_path=public as $$ begin if not public.is_editor() then raise exception 'Editor required';end if;return (select count(*) from user_notice_matches where notice_id=target_notice);end $$;
revoke all on function public.notice_match_count(uuid) from public,anon;
grant execute on function public.notice_match_count(uuid) to authenticated;
-- Merge keeps the original target and retires the duplicate atomically.
create function public.merge_notices(keep_id uuid,duplicate_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_editor() then raise exception 'Editor required';end if;
 if keep_id=duplicate_id then raise exception 'Choose two different notices';end if;
 if not exists(select 1 from notices where id=keep_id) or not exists(select 1 from notices where id=duplicate_id) then raise exception 'Notice not found';end if;
 insert into user_notice_matches(user_id,notice_id,relevance_score,match_reasons_json,read_at,saved_at,dismissed_at)
 select user_id,keep_id,relevance_score,match_reasons_json,read_at,saved_at,dismissed_at from user_notice_matches where notice_id=duplicate_id
 on conflict(user_id,notice_id) do update set saved_at=coalesce(user_notice_matches.saved_at,excluded.saved_at),read_at=coalesce(user_notice_matches.read_at,excluded.read_at);
 update deadlines set notice_id=keep_id where notice_id=duplicate_id;
 update notices set verification_status='rejected',updated_at=now() where id=duplicate_id;
end $$;
revoke all on function public.merge_notices(uuid,uuid) from public,anon;
grant execute on function public.merge_notices(uuid,uuid) to authenticated;

create trigger deadline_matches after insert or update on deadlines for each row execute procedure public.notice_matches_changed();
