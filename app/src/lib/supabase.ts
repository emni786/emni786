import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn(
    '[xenonowledge] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Backend calls will fail until you set them in app/.env.local'
  );
}

export const supabase: SupabaseClient = createClient(url ?? 'http://localhost', anon ?? 'public-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const FUNCTIONS_URL = url ? `${url}/functions/v1` : '/functions/v1';

export async function callFunction<T = unknown>(name: string, body?: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sessionData.session?.access_token) {
    headers.Authorization = `Bearer ${sessionData.session.access_token}`;
  } else if (anon) {
    headers.Authorization = `Bearer ${anon}`;
  }
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`function ${name} failed: ${res.status} ${err}`);
  }
  return (await res.json()) as T;
}
