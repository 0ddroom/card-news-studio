alter table public.stories
add column if not exists password_hash text;

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

drop policy if exists "Anyone can update card news images" on storage.objects;

create policy "Anyone can update card news images"
on storage.objects
for update
using (bucket_id in ('story-images', 'card-images'))
with check (bucket_id in ('story-images', 'card-images'));
