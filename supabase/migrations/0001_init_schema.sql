-- ============================================================================
-- 0001_init_schema.sql
-- Core schema for Xenonowledge: profiles, links, collections, supporting
-- integration + analytics tables. Extensions, enums, tables, indexes only.
-- RLS, triggers and cron live in subsequent migrations.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_net;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pgsodium;

-- ---- Enums ------------------------------------------------------------------
do $$ begin
  create type content_type as enum ('tool','article','repo','docs','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_status as enum ('pending','analyzing','ready','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_source as enum ('manual','bulk','extension','bookmarklet','telegram','rss','discover');
exception when duplicate_object then null; end $$;

do $$ begin
  create type digest_frequency as enum ('daily','weekly','monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type auto_tag_condition as enum ('domain_contains','url_contains','title_contains','content_type_is');
exception when duplicate_object then null; end $$;

do $$ begin
  create type trending_scope as enum ('global','user');
exception when duplicate_object then null; end $$;

-- ---- profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  theme text check (theme in ('dark','light')) default 'dark',
  auto_retry_enabled boolean not null default true,
  auto_retry_interval_hours int not null default 15 check (auto_retry_interval_hours between 1 and 72),
  created_at timestamptz not null default now()
);
create index if not exists profiles_username_idx on public.profiles (lower(username));

-- ---- links ------------------------------------------------------------------
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  normalized_url text not null,
  title text,
  description text,
  og_image text,
  favicon text,
  content_type content_type not null default 'other',
  confidence real not null default 0,
  summary text,
  key_points text[] not null default '{}',
  tags text[] not null default '{}',
  notes text,
  status link_status not null default 'pending',
  source link_source not null default 'manual',
  is_pinned boolean not null default false,
  save_count integer not null default 1,
  http_status int,
  embedding vector(1536),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_analyzed_at timestamptz,
  last_failed_at timestamptz,
  fail_reason text,
  unique (user_id, normalized_url)
);
create index if not exists links_user_created_idx on public.links (user_id, created_at desc);
create index if not exists links_status_idx on public.links (status);
create index if not exists links_tags_gin on public.links using gin (tags);
create index if not exists links_url_trgm on public.links using gin (url gin_trgm_ops);
create extension if not exists pg_trgm;
create index if not exists links_title_trgm on public.links using gin (coalesce(title,'') gin_trgm_ops);
create index if not exists links_summary_trgm on public.links using gin (coalesce(summary,'') gin_trgm_ops);
create index if not exists links_embedding_idx on public.links using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---- collections ------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  is_ai_generated boolean not null default false,
  color text,
  icon text,
  created_at timestamptz not null default now()
);
create index if not exists collections_user_idx on public.collections (user_id);

create table if not exists public.collection_links (
  collection_id uuid not null references public.collections(id) on delete cascade,
  link_id uuid not null references public.links(id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, link_id)
);

-- ---- automation -------------------------------------------------------------
create table if not exists public.auto_tagging_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  condition_type auto_tag_condition not null,
  condition_value text not null,
  tag_to_add text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rss_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_url text not null,
  title text,
  last_fetched_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, feed_url)
);

create table if not exists public.telegram_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  bot_token_encrypted bytea,
  bot_username text,
  webhook_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  token_prefix text not null,
  label text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists extension_tokens_user_idx on public.extension_tokens (user_id);
create index if not exists extension_tokens_hash_idx on public.extension_tokens (token_hash);

-- ---- digest -----------------------------------------------------------------
create table if not exists public.digest_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  frequency digest_frequency not null default 'weekly',
  email_enabled boolean not null default true,
  last_sent_at timestamptz
);

create table if not exists public.digest_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  summary_json jsonb not null,
  sent_at timestamptz not null default now()
);

-- ---- search & discovery -----------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  link_id uuid references public.links(id) on delete cascade,
  url text,
  title text,
  score real not null default 0,
  reason text,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);

create table if not exists public.trending_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope trending_scope not null,
  user_id uuid references auth.users(id) on delete cascade,
  period text not null,
  topics jsonb not null,
  generated_at timestamptz not null default now()
);
create index if not exists trending_lookup_idx
  on public.trending_snapshots (scope, period, generated_at desc);

-- ---- tag_index materialized view -------------------------------------------
create materialized view if not exists public.tag_index as
  select user_id, tag, count(*)::int as count
  from public.links, unnest(tags) as tag
  where deleted_at is null
  group by user_id, tag;
create unique index if not exists tag_index_pk on public.tag_index (user_id, tag);

-- ---- updated_at trigger -----------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_links_updated_at on public.links;
create trigger trg_links_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- ---- new-user bootstrap -----------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, auth as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1))
  on conflict (id) do nothing;

  insert into public.digest_settings (user_id, frequency, email_enabled)
  values (new.id, 'weekly', true)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();
