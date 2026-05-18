import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { authenticate, serviceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  let userId: string;
  try { userId = (await authenticate(req)).userId; } catch { return errorResponse(401, 'unauthenticated'); }

  const svc = serviceClient();
  const { data: links } = await svc
    .from('links')
    .select('id, url')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .limit(200);

  let ok = 0;
  let broken = 0;

  await Promise.all(
    (links ?? []).map(async (l) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(l.url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
        clearTimeout(t);
        const status = res.status;
        await svc.from('links').update({ http_status: status }).eq('id', l.id);
        if (status >= 400) broken += 1; else ok += 1;
      } catch {
        await svc.from('links').update({ http_status: 0 }).eq('id', l.id);
        broken += 1;
      }
    })
  );

  return jsonResponse({ ok, broken });
});
