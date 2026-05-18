-- ============================================================================
-- 0003_link_logic.sql
-- Helpers + triggers for the link pipeline: URL normalisation, duplicate
-- detection (increments save_count), auto-tagging rule application,
-- analyze trigger via pg_net, retry helper.
-- ============================================================================

-- normalise URL: lowercase host, strip utm_* / fbclid / gclid, trailing slash, hash
create or replace function public.normalize_url(input text)
returns text language plpgsql immutable as $$
declare
  lower_url text := lower(trim(input));
begin
  -- strip hash
  lower_url := regexp_replace(lower_url, '#.*$', '');
  -- strip utm_*, fbclid, gclid query params
  lower_url := regexp_replace(lower_url, '([?&])(utm_[^=&]+|fbclid|gclid)=[^&]*', '\1', 'gi');
  lower_url := regexp_replace(lower_url, '[?&]$', '');
  lower_url := regexp_replace(lower_url, '\?&', '?');
  -- trailing slash
  lower_url := regexp_replace(lower_url, '/+$', '');
  return lower_url;
end $$;

-- bump save_count if a link with this normalized_url already exists (per user)
create or replace function public.handle_link_dedupe()
returns trigger
language plpgsql security definer set search_path = public as $$
declare existing public.links;
begin
  new.normalized_url := coalesce(new.normalized_url, public.normalize_url(new.url));
  select * into existing
  from public.links
  where user_id = new.user_id
    and normalized_url = new.normalized_url
    and deleted_at is null
  limit 1;
  if existing.id is not null then
    update public.links
       set save_count = save_count + 1,
           updated_at = now()
     where id = existing.id;
    -- Throwing a special signal is awkward; instead silently swallow the insert.
    return null;
  end if;
  return new;
end $$;

drop trigger if exists trg_links_dedupe on public.links;
create trigger trg_links_dedupe
  before insert on public.links
  for each row execute function public.handle_link_dedupe();

-- apply auto-tagging rules after AI tagging finishes
create or replace function public.apply_auto_tag_rules()
returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.auto_tagging_rules; matched boolean;
begin
  if new.status <> 'ready' then return new; end if;
  if new.tags is null then new.tags := '{}'; end if;

  for r in
    select * from public.auto_tagging_rules
    where user_id = new.user_id and is_active = true
  loop
    matched := case r.condition_type
      when 'domain_contains'   then position(lower(r.condition_value) in coalesce(new.url, '')) > 0
      when 'url_contains'      then position(lower(r.condition_value) in coalesce(new.url, '')) > 0
      when 'title_contains'    then position(lower(r.condition_value) in lower(coalesce(new.title, ''))) > 0
      when 'content_type_is'   then new.content_type::text = r.condition_value
    end;
    if matched and not (r.tag_to_add = any(new.tags)) then
      new.tags := array_append(new.tags, r.tag_to_add);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_links_autotag on public.links;
create trigger trg_links_autotag
  before update on public.links
  for each row when (new.status = 'ready' and old.status <> 'ready')
  execute function public.apply_auto_tag_rules();

-- Refresh the tag_index materialized view in the background.
-- We intentionally do not refresh it on every link write; pg_cron does so
-- every 10 minutes (see 0004_cron_jobs.sql).

-- async kickoff: when a link is inserted with status='pending', call analyze-link
-- via pg_net. We rely on a service-role JWT stored in vault. Operators may
-- prefer to remove this trigger and have ingest-link call analyze-link directly.

create or replace function public.queue_analyze_link()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_url text;
begin
  -- this is a no-op if pg_net is not configured. ingest-link edge function
  -- explicitly invokes analyze-link, so this trigger is best-effort only.
  begin
    base_url := current_setting('app.settings.supabase_url', true);
    if base_url is null or length(base_url) = 0 then
      return new;
    end if;
    perform net.http_post(
      url := base_url || '/functions/v1/analyze-link',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('id', new.id)
    );
  exception when others then
    -- silently ignore; ingest-link will retry
    null;
  end;
  return new;
end $$;
-- left disabled by default; enable with:
--   create trigger trg_links_analyze after insert on public.links for each row execute function public.queue_analyze_link();

-- helper: a function the auto-retry cron job calls
create or replace function public.queue_failed_retries()
returns int
language plpgsql security definer set search_path = public as $$
declare
  retried int := 0;
begin
  with candidates as (
    select l.id, p.auto_retry_interval_hours
    from public.links l
    join public.profiles p on p.id = l.user_id
    where l.status = 'failed'
      and p.auto_retry_enabled = true
      and (l.last_failed_at is null or l.last_failed_at < now() - (p.auto_retry_interval_hours || ' hours')::interval)
    limit 200
  )
  update public.links
     set status = 'pending', fail_reason = null
   where id in (select id from candidates);
  get diagnostics retried = row_count;
  return retried;
end $$;
