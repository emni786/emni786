import { z } from 'https://esm.sh/zod@3.23.8';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { authenticate, serviceClient } from '../_shared/supabase.ts';
import { chatJson, embed } from '../_shared/ai.ts';

const InputSchema = z.object({
  query: z.string().min(1).max(400),
});

interface ParsedQuery {
  text: string;
  tags: string[];
  since_days: number | null;
  content_type: string | null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  let userId: string;
  try { userId = (await authenticate(req)).userId; } catch { return errorResponse(401, 'unauthenticated'); }

  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, parsed.error.message);

  // 1) parse the query into filters
  let filters: ParsedQuery;
  try {
    filters = await chatJson<ParsedQuery>({
      system:
        'Translate a natural-language search query about a personal link library into structured filters. Be permissive — empty arrays or nulls if uncertain.',
      schemaHint: `Return JSON: { "text": string, "tags": string[], "since_days": number|null, "content_type": "tool"|"article"|"repo"|"docs"|"other"|null }`,
      user: parsed.data.query,
      maxTokens: 300,
    });
  } catch {
    filters = { text: parsed.data.query, tags: [], since_days: null, content_type: null };
  }

  const svc = serviceClient();
  const baseColumns = '*';
  let q = svc.from('links').select(baseColumns).eq('user_id', userId).is('deleted_at', null).limit(40);
  if (filters.content_type) q = q.eq('content_type', filters.content_type);
  if (filters.since_days) {
    const cutoff = new Date(Date.now() - filters.since_days * 86400_000).toISOString();
    q = q.gte('created_at', cutoff);
  }
  if (filters.tags?.length) q = q.overlaps('tags', filters.tags);
  if (filters.text) {
    const like = `%${filters.text.replace(/[%_]/g, '')}%`;
    q = q.or(`title.ilike.${like},summary.ilike.${like},description.ilike.${like}`);
  }

  // 2) optionally re-rank by embedding similarity
  const emb = await embed(parsed.data.query);
  const { data: rows } = await q;
  if (!rows) return jsonResponse({ results: [], filters });
  let results = rows;
  if (emb && rows.some((r: any) => r.embedding)) {
    results = (rows as any[])
      .map((r) => ({ r, sim: cosine(emb, r.embedding) }))
      .sort((a, b) => (b.sim ?? 0) - (a.sim ?? 0))
      .map((x) => x.r);
  }

  return jsonResponse({ results, filters });
});

function cosine(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
