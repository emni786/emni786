import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { authenticate, serviceClient } from '../_shared/supabase.ts';
import { chatJson } from '../_shared/ai.ts';

interface AIOut {
  items: { url: string; title: string; reason: string; score: number }[];
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  let userId: string;
  try { userId = (await authenticate(req)).userId; } catch { return errorResponse(401, 'unauthenticated'); }

  const svc = serviceClient();
  const [{ data: tags }, { data: recent }] = await Promise.all([
    svc.from('tag_index').select('tag, count').eq('user_id', userId).order('count', { ascending: false }).limit(15),
    svc.from('links').select('title, url').eq('user_id', userId).is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
  ]);

  const ai = await chatJson<AIOut>({
    system:
      'Suggest URLs to read next based on a user\'s reading pattern. Prefer canonical, evergreen sources. Return only real URLs you are confident exist.',
    schemaHint:
      'Return JSON: { "items": [{ "url": string (https), "title": string, "reason": string (1 short sentence), "score": number 0..1 }] }, exactly 10 items.',
    user:
      `Top tags: ${(tags ?? []).map((t) => `${t.tag}(${t.count})`).join(', ')}.\n` +
      `Recent saves (titles): ${(recent ?? []).map((r) => r.title ?? r.url).slice(0, 15).join(' | ')}.\n` +
      'Recommend 10 URLs the user has likely not seen.',
    maxTokens: 1000,
  });

  const rows = (ai.items ?? []).slice(0, 10).map((i) => ({
    user_id: userId,
    url: i.url,
    title: i.title,
    reason: i.reason,
    score: typeof i.score === 'number' ? i.score : 0.5,
  }));
  if (rows.length === 0) return jsonResponse({ count: 0 });

  const { error } = await svc.from('recommendations').insert(rows);
  if (error) return errorResponse(500, error.message);
  return jsonResponse({ count: rows.length });
});
