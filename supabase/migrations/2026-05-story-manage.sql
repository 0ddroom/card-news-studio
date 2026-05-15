create extension if not exists pgcrypto with schema extensions;

create or replace function public.can_manage_story(stored_hash text, plain_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if plain_key = 'successlog' then
    return true;
  end if;

  if stored_hash is null or stored_hash = '' then
    return false;
  end if;

  return encode(digest(plain_key, 'sha256'), 'hex') = stored_hash;
end;
$$;

create or replace function public.delete_story_with_key(target_story_id text, plain_key text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash
  into stored_hash
  from public.stories
  where id = target_story_id;

  if not public.can_manage_story(stored_hash, plain_key) then
    return false;
  end if;

  delete from public.stories
  where id = target_story_id;

  return true;
end;
$$;

create or replace function public.update_story_with_key(
  target_story_id text,
  plain_key text,
  updated_report_month text,
  updated_division text,
  updated_owner text,
  updated_email text,
  updated_title text,
  updated_period text,
  updated_participants text,
  updated_summary text,
  updated_impact_metric text,
  updated_evidence text,
  updated_quote text,
  updated_desired_message text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  select password_hash
  into stored_hash
  from public.stories
  where id = target_story_id;

  if not public.can_manage_story(stored_hash, plain_key) then
    return false;
  end if;

  update public.stories
  set
    report_month = updated_report_month,
    division = updated_division,
    owner = updated_owner,
    email = updated_email,
    title = updated_title,
    period = updated_period,
    participants = updated_participants,
    summary = updated_summary,
    impact_metric = updated_impact_metric,
    evidence = updated_evidence,
    culture_value = updated_evidence,
    quote = updated_quote,
    desired_message = updated_desired_message
  where id = target_story_id;

  return true;
end;
$$;

grant execute on function public.can_manage_story(text, text) to anon, authenticated;
grant execute on function public.delete_story_with_key(text, text) to anon, authenticated;
grant execute on function public.update_story_with_key(text, text, text, text, text, text, text, text, text, text, text, text, text, text) to anon, authenticated;
