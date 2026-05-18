import { z } from 'https://esm.sh/zod@3.23.8';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { authenticate, serviceClient } from '../_shared/supabase.ts';
import { chatJson } from '../_shared/ai.ts';

const InputSchema = z.union([
  z.object({
    mode: z.literal('trending'),
    period: z.string().default('today'),
    topic: z.string().default('AI'),
    scope: z.enum(['global', 'user']).default('global'),
  }),
  z.object({ mode: z.literal('knowledge-report') }),
]);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');
  let userId: string;
  try { userId = (await authenticate(req)).userId; } catch { return errorResponse(401, 'unauthenticated'); }

  const body = await req.json().catch(() => null);
  const parse = InputSchema.safeParse(body);
  if (!parse.success) return errorResponse(400, parse.error.message);

  const svc = serviceClient();

  if (parse.data.mode === 'trending') {
    const out = await chatJson<{ topics: { topic: string; score: number; reason: string }[] }>({
      system: 'You are a tech-news analyst. Suggest what is trending right now in the requested topic.',
      schemaHint:
        'Return JSON: { "topics": [{"topic": string, "score": number 0..1, "reason": string (one short sentence)}] } with 8-12 topics.',
      user: `Topic: ${parse.data.topic}\nPeriod: ${parse.data.period}\nReturn the most useful trending items for a developer / knowledge worker.`,
      maxTokens: 700,
    });
    await svc.from('trending_snapshots').insert({
      scope: parse.data.scope,
      user_id: parse.data.scope === 'user' ? userId : null,
      period: parse.data.period,
      topics: out.topics ?? [],
    });
    return jsonResponse({ topics: out.topics ?? [] });
  }

  if (parse.data.mode === 'knowledge-report') {
    // gather a profile
    const [{ data: links }, { data: tags }] = await Promise.all([
      svc.from('links').select('title, tags, content_type, created_at').eq('user_id', userId).is('deleted_at', null).limit(500),
      svc.from('tag_index').select('tag, count').eq('user_id', userId).order('count', { ascending: false }).limit(20),
    ]);

    const out = await chatJson<{ report: string }>({
      system:
        'You write concise knowledge-habit reports. Honest, specific, and actionable. No filler. Markdown allowed.',
      schemaHint: 'Return JSON: { "report": string (300-450 words, markdown) }',
      user:
        `User has ${links?.length ?? 0} links. Top tags: ${(tags ?? []).map((t) => `${t.tag}(${t.count})`).join(', ')}.\n` +
        `Recent saves (sample): ${(links ?? []).slice(-12).map((l) => l.title ?? '').join(' | ')}.\n` +
        `Write a report covering: 1) reading themes, 2) blind spots, 3) 3 specific recommendations of what to read or learn next.`,
      maxTokens: 800,
    });
    return jsonResponse({ report: out.report ?? '' });
  }

  return errorResponse(400, 'unknown mode');
});
