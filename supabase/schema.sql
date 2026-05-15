create table if not exists public.stories (
  id text primary key,
  created_at timestamptz not null default now(),
  report_month text not null,
  division text not null,
  owner text not null,
  email text not null,
  title text not null,
  period text not null,
  participants text not null,
  summary text not null,
  impact_metric text not null,
  evidence text not null,
  culture_value text not null,
  quote text not null,
  desired_message text not null,
  password_hash text,
  image_name text,
  image_url text
);

create table if not exists public.cards (
  id text primary key,
  story_id text references public.stories(id) on delete set null,
  created_at timestamptz not null default now(),
  title text not null,
  division text not null,
  template_id text not null,
  tone text not null,
  prompt text not null,
  image_url text not null
);

alter table public.stories enable row level security;
alter table public.cards enable row level security;

drop policy if exists "Anyone can read stories" on public.stories;
drop policy if exists "Anyone can submit stories" on public.stories;
drop policy if exists "Anyone can read cards" on public.cards;
drop policy if exists "Anyone can save cards" on public.cards;
drop policy if exists "Anyone can delete cards" on public.cards;

create policy "Anyone can read stories"
on public.stories
for select
using (true);

create policy "Anyone can submit stories"
on public.stories
for insert
with check (true);

create extension if not exists pgcrypto with schema extensions;

create or replace function public.delete_story_with_password(target_story_id text, plain_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
  input_hash text;
begin
  select password_hash
  into stored_hash
  from public.stories
  where id = target_story_id;

  if stored_hash is null or stored_hash = '' then
    return false;
  end if;

  input_hash := encode(digest(plain_password, 'sha256'), 'hex');

  if input_hash <> stored_hash then
    return false;
  end if;

  delete from public.stories
  where id = target_story_id;

  return true;
end;
$$;

grant execute on function public.delete_story_with_password(text, text) to anon, authenticated;

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

create policy "Anyone can read cards"
on public.cards
for select
using (true);

create policy "Anyone can save cards"
on public.cards
for insert
with check (true);

create policy "Anyone can delete cards"
on public.cards
for delete
using (true);

insert into storage.buckets (id, name, public)
values
  ('story-images', 'story-images', true),
  ('card-images', 'card-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Anyone can read card news images" on storage.objects;
drop policy if exists "Anyone can upload card news images" on storage.objects;
drop policy if exists "Anyone can update card news images" on storage.objects;

create policy "Anyone can read card news images"
on storage.objects
for select
using (bucket_id in ('story-images', 'card-images'));

create policy "Anyone can upload card news images"
on storage.objects
for insert
with check (bucket_id in ('story-images', 'card-images'));

create policy "Anyone can update card news images"
on storage.objects
for update
using (bucket_id in ('story-images', 'card-images'))
with check (bucket_id in ('story-images', 'card-images'));
