-- ============================================================================
-- 0002_rls_policies.sql
-- Row Level Security: every table is owner-scoped (user_id = auth.uid()),
-- with a few public-read exceptions (profiles by username, pinned links of a
-- given profile, public collections).
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.collections enable row level security;
alter table public.collection_links enable row level security;
alter table public.auto_tagging_rules enable row level security;
alter table public.rss_feeds enable row level security;
alter table public.telegram_integrations enable row level security;
alter table public.extension_tokens enable row level security;
alter table public.digest_settings enable row level security;
alter table public.digest_history enable row level security;
alter table public.saved_searches enable row level security;
alter table public.recommendations enable row level security;
alter table public.trending_snapshots enable row level security;

-- profiles: a user reads/writes their own row; everyone can read by username
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to anon, authenticated using (true);

-- links: owner can do anything; pinned links of a user are readable by anon
drop policy if exists links_owner on public.links;
create policy links_owner on public.links
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists links_public_pinned on public.links;
create policy links_public_pinned on public.links
  for select to anon, authenticated
  using (is_pinned = true and deleted_at is null);

-- collections: owner only; readable by anon for the public profile
drop policy if exists collections_owner on public.collections;
create policy collections_owner on public.collections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists collections_public_read on public.collections;
create policy collections_public_read on public.collections
  for select to anon, authenticated using (true);

-- collection_links: must own the parent collection
drop policy if exists collection_links_owner on public.collection_links;
create policy collection_links_owner on public.collection_links
  for all to authenticated
  using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

-- generic owner policies
do $$
declare t text;
begin
  for t in select unnest(array[
    'auto_tagging_rules','rss_feeds','telegram_integrations','extension_tokens',
    'digest_settings','digest_history','saved_searches','recommendations'
  ])
  loop
    execute format($f$
      drop policy if exists %1$s_owner on public.%1$s;
      create policy %1$s_owner on public.%1$s
        for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
    $f$, t);
  end loop;
end $$;

-- trending_snapshots: global rows readable by everyone; user rows owner-scoped
drop policy if exists trending_global_read on public.trending_snapshots;
create policy trending_global_read on public.trending_snapshots
  for select to anon, authenticated using (scope = 'global');

drop policy if exists trending_user_owner on public.trending_snapshots;
create policy trending_user_owner on public.trending_snapshots
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- sessions_view: a row-filtered view of auth.sessions for the current user
create or replace view public.sessions_view
with (security_invoker=true) as
  select s.id::text as id,
         s.user_id,
         s.created_at,
         s.updated_at,
         s.user_agent,
         s.ip
  from auth.sessions s
  where s.user_id = auth.uid();
grant select on public.sessions_view to authenticated;

-- materialized view permissions
grant select on public.tag_index to authenticated;
