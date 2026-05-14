drop policy if exists "Anyone can delete cards" on public.cards;

create policy "Anyone can delete cards"
on public.cards
for delete
using (true);
