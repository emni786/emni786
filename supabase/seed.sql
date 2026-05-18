-- ============================================================================
-- seed.sql — populate a demo user with 5 ready-to-go links so the UI is alive.
--
-- Apply with:
--     psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Then sign in with demo@xenonowledge.app / demo-password-123 (you'll need to
-- create the auth user first; see the bottom of this file).
-- ============================================================================

do $$
declare
  v_user uuid;
begin
  -- Pick the first auth user; if none exists, do nothing (the migration must
  -- have run first and you must have signed up at least one user).
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then
    raise notice 'No auth.users found — sign up an account first, then re-run this seed.';
    return;
  end if;

  -- Make sure profile exists (handle_new_user should have done this already)
  insert into public.profiles (id, username, display_name, bio)
  values (v_user, 'demo', 'Demo User', 'Demo profile for Xenonowledge.')
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        bio = excluded.bio;

  -- Insert 5 demo links (only if they don't already exist for this user)
  insert into public.links (
    user_id, url, normalized_url, title, description,
    summary, key_points, tags, content_type, confidence,
    status, source, is_pinned, save_count, last_analyzed_at
  )
  values
  (v_user,
   'https://react.dev/learn',
   'https://react.dev/learn',
   'Quick Start – React',
   'The official React tutorial covering components, JSX, and state.',
   'A concise, official walkthrough of React fundamentals: components, JSX, hooks, props, and state. Suitable both for absolute beginners and as a quick refresher for experienced developers.',
   array[
     'Components are reusable UI building blocks expressed as functions.',
     'State is managed via the useState hook and triggers re-renders on change.',
     'Effects sync components with external systems via useEffect.',
     'Props pass data downward; events bubble upward.',
     'Lists need stable keys; conditional rendering uses normal JS expressions.'
   ],
   array['react','frontend','tutorial','jsx','hooks'],
   'docs', 0.95, 'ready', 'manual', true, 1, now() - interval '2 days'),

  (v_user,
   'https://tailwindcss.com/docs/utility-first',
   'https://tailwindcss.com/docs/utility-first',
   'Utility-First Fundamentals – Tailwind CSS',
   'Why Tailwind embraces utility classes for fast, maintainable design systems.',
   'Tailwind argues that small, single-purpose utility classes scale far better than custom CSS or pre-built components. The article shows how to compose layouts and design systems without naming things, while keeping consistency through shared tokens.',
   array[
     'Utility classes eliminate the naming problem.',
     'Design tokens live in tailwind.config (colors, spacing, fonts).',
     'Variants like hover:, md:, dark: handle responsive and stateful styles inline.',
     'Components are extracted via @apply or React when patterns repeat.',
     'Tree-shaken builds keep production CSS small.'
   ],
   array['css','tailwind','design-systems','frontend'],
   'docs', 0.92, 'ready', 'manual', true, 1, now() - interval '1 days'),

  (v_user,
   'https://github.com/openai/openai-node',
   'https://github.com/openai/openai-node',
   'openai/openai-node — Official OpenAI Node.js client',
   'TypeScript / JavaScript client library for the OpenAI API.',
   'The official Node.js SDK for the OpenAI API. Supports streaming, function calling, file uploads, the Realtime API, embeddings, and image generation. Works in Node, Deno, and Bun.',
   array[
     'First-class TypeScript types for every endpoint.',
     'Streaming responses with for-await iteration.',
     'Built-in retries with exponential backoff.',
     'Compatible with Azure OpenAI via baseURL override.',
     'MIT licensed, actively maintained.'
   ],
   array['ai','openai','typescript','sdk','open-source'],
   'repo', 0.97, 'ready', 'extension', false, 3, now() - interval '5 days'),

  (v_user,
   'https://supabase.com/blog/postgres-full-text-search',
   'https://supabase.com/blog/postgres-full-text-search',
   'Postgres Full-Text Search Is Awesome',
   'A practical introduction to tsvector / tsquery and ranking.',
   'Postgres ships a powerful full-text search engine that handles 90% of search needs without bringing in Elasticsearch. The post walks through tsvector / tsquery, GIN indexes, language stemming, ranking with ts_rank, and combining FTS with trigram similarity for fuzzy matching.',
   array[
     'tsvector indexes preprocessed lexemes; tsquery searches them.',
     'GIN indexes are essential for fast queries.',
     'Stop words and stemming are language-specific.',
     'ts_rank ranks results; combine with trigram for fuzzy matching.',
     'A materialized search column keeps queries fast.'
   ],
   array['postgres','search','databases','supabase','backend'],
   'article', 0.93, 'ready', 'rss', false, 2, now() - interval '3 days'),

  (v_user,
   'https://three.js.org/manual/#en/installation',
   'https://three.js.org/manual/#en/installation',
   'Three.js Manual — Installation',
   'How to install and set up three.js with npm or modules.',
   'Three.js can be installed from npm or used directly from a CDN with ES modules. The manual walks through both, plus how to set up a renderer, scene, camera, and a render loop. The minimum viable scene is under 30 lines.',
   array[
     'Use npm i three for bundler workflows; pin a major version.',
     'Use import maps with CDN ESM if you do not want a bundler.',
     'A scene needs Scene, Camera, Renderer, and a render loop.',
     'Use OrbitControls for a draggable camera.',
     'Production builds tree-shake unused modules.'
   ],
   array['three-js','3d','webgl','tutorial'],
   'docs', 0.9, 'ready', 'bookmarklet', false, 1, now() - interval '6 hours')
  on conflict (user_id, normalized_url) do nothing;

  -- Spread out created_at so the heatmap and charts look interesting
  update public.links set created_at = now() - interval '2 days', updated_at = now()
    where user_id = v_user and normalized_url like '%react.dev%';
  update public.links set created_at = now() - interval '1 days'
    where user_id = v_user and normalized_url like '%tailwindcss.com%';
  update public.links set created_at = now() - interval '5 days'
    where user_id = v_user and normalized_url like '%openai-node%';
  update public.links set created_at = now() - interval '3 days'
    where user_id = v_user and normalized_url like '%postgres-full-text%';
  update public.links set created_at = now() - interval '6 hours'
    where user_id = v_user and normalized_url like '%three.js%';

  -- A sample collection
  insert into public.collections (user_id, name, color, icon, description, is_ai_generated)
  values (v_user, 'Frontend basics', '#10b981', '🎨', 'Hand-picked references for the frontend stack.', false)
  on conflict do nothing;

  -- Sample digest settings
  insert into public.digest_settings (user_id, frequency, email_enabled)
  values (v_user, 'weekly', true)
  on conflict (user_id) do nothing;

  -- Refresh tag index
  refresh materialized view public.tag_index;
end $$;

-- ============================================================================
-- (Optional) create a demo auth user via the admin API. Run this once if you
-- don't want to use the sign-up form. Requires service-role privilege.
--
--   curl -X POST $SUPABASE_URL/auth/v1/admin/users \
--     -H "apikey: $SERVICE_ROLE_KEY" \
--     -H "authorization: Bearer $SERVICE_ROLE_KEY" \
--     -H "content-type: application/json" \
--     -d '{"email":"demo@xenonowledge.app","password":"demo-password-123","email_confirm":true}'
-- ============================================================================
