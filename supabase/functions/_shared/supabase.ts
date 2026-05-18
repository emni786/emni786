import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * A service-role client. Use sparingly; bypasses RLS. Always validate user.
 */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A user-scoped client built from the request's bearer token. Respects RLS.
 */
export function userClient(req: Request): SupabaseClient {
  const auth = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolve the authenticated user, either via JWT (preferred) or via an
 * `x-extension-token` header for the Chrome extension / bookmarklet.
 */
export async function authenticate(req: Request): Promise<{ userId: string; viaToken: boolean }> {
  const ext = req.headers.get('x-extension-token');
  if (ext) {
    const svc = serviceClient();
    const hash = await sha256Hex(ext);
    const { data, error } = await svc
      .from('extension_tokens')
      .select('id, user_id, revoked_at')
      .eq('token_hash', hash)
      .is('revoked_at', null)
      .maybeSingle();
    if (error || !data) throw new Error('invalid extension token');
    await svc.from('extension_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
    return { userId: data.user_id, viaToken: true };
  }

  const supa = userClient(req);
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user) throw new Error('unauthenticated');
  return { userId: data.user.id, viaToken: false };
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
