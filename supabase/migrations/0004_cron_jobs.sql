-- ============================================================================
-- 0004_cron_jobs.sql
-- pg_cron schedules. The actual work is done by Supabase edge functions
-- invoked via pg_net; we just trigger them on a schedule.
-- ============================================================================

-- Refresh the tag_index materialized view every 10 minutes
select cron.schedule(
  'refresh-tag-index',
  '*/10 * * * *',
  $$ refresh materialized view concurrently public.tag_index $$
);

-- Hourly: reschedule failed links for retry (auto-retry feature)
select cron.schedule(
  'retry-failed-links',
  '7 * * * *',
  $$ select public.queue_failed_retries() $$
);

-- Every 30 minutes: poll RSS feeds via edge function
select cron.schedule(
  'poll-rss-feeds',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/poll-rss',
    headers := jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

-- Daily 08:00 UTC: send digests
select cron.schedule(
  'send-daily-digests',
  '0 8 * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-digest',
    headers := jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  )
  $$
);
