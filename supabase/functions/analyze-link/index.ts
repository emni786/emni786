import { z } from 'https://esm.sh/zod@3.23.8';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { fetchPageMeta } from '../_shared/html.ts';
import { chatJson, embed } from '../_shared/ai.ts';

const InputSchema = z.object({ id: z.string().uuid() });

interface Analysis {
  summary: string;
  key_points: string[];
  tags: string[];
  content_type: 'tool' | 'article' | 'repo' | 'docs' | 'other';
  confidence: number;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  const body = await req.json().catch(() => null);
  const parse = InputSchema.safeParse(body);
  if (!parse.success) return errorResponse(400, 'expected { id }');

  const supa = serviceClient();
  const { data: link, error } = await supa.from('links').select('*').eq('id', parse.data.id).maybeSingle();
  if (error || !link) return errorResponse(404, 'link not found');

  await supa.from('links').update({ status: 'analyzing' }).eq('id', link.id);

  try {
    const meta = await fetchPageMeta(link.url);
    const ai = await analyse(link.url, meta);
    const emb = await embed(`${ai.summary}\n${ai.tags.join(' ')}\n${ai.key_points.join('\n')}`);

    await supa
      .from('links')
      .update({
        title: meta.title,
        description: meta.description,
        og_image: meta.ogImage,
        favicon: meta.favicon,
        summary: ai.summary,
        key_points: ai.key_points,
        tags: ai.tags,
        content_type: ai.content_type,
        confidence: clamp01(ai.confidence),
        status: 'ready',
        last_analyzed_at: new Date().toISOString(),
        embedding: emb,
        fail_reason: null,
      })
      .eq('id', link.id);
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 240) ?? 'analysis failed';
    await supa
      .from('links')
      .update({
        status: 'failed',
        last_failed_at: new Date().toISOString(),
        fail_reason: msg,
      })
      .eq('id', link.id);
    console.error('analyze-link failed', { id: link.id, msg });
    return errorResponse(500, msg);
  }
});

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

async function analyse(url: string, meta: { title: string | null; description: string | null; text: string }): Promise<Analysis> {
  const system =
    'You analyse web pages and produce structured metadata. Be concise, factual, and avoid speculation.';
  const schemaHint = `Return ONLY a JSON object matching:
{
  "summary": string (3-4 sentences, plain text, no markdown),
  "key_points": string[5..8] (single-sentence highlights),
  "tags": string[5..10] (lowercase, hyphenated, broadly useful),
  "content_type": "tool"|"article"|"repo"|"docs"|"other",
  "confidence": number (0..1, your confidence in the result)
}`;
  const user = `URL: ${url}
TITLE: ${meta.title ?? '(none)'}
DESCRIPTION: ${meta.description ?? '(none)'}
PAGE TEXT (truncated):
${meta.text || '(no extracted text)'}`;

  const out = await chatJson<Analysis>({ system, user, schemaHint, maxTokens: 800 });

  // sanity-clean output
  return {
    summary: String(out.summary ?? '').slice(0, 1200),
    key_points: Array.isArray(out.key_points) ? out.key_points.map(String).slice(0, 8) : [],
    tags: Array.isArray(out.tags)
      ? out.tags.map((t) => String(t).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean).slice(0, 10)
      : [],
    content_type: ['tool', 'article', 'repo', 'docs', 'other'].includes(String(out.content_type))
      ? (out.content_type as Analysis['content_type'])
      : 'other',
    confidence: typeof out.confidence === 'number' ? out.confidence : 0.5,
  };
}
