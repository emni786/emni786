import { z } from 'https://esm.sh/zod@3.23.8';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { authenticate, serviceClient, sha256Hex } from '../_shared/supabase.ts';
import { normalizeUrl } from '../_shared/html.ts';

const IngestSchema = z.object({
  url: z.string().url(),
  source: z.enum(['manual', 'bulk', 'extension', 'bookmarklet', 'telegram', 'rss', 'discover']).optional(),
});

const ActionSchema = z.union([
  z.object({ action: z.literal('create-extension-token'), label: z.string().optional() }),
  z.object({ action: z.literal('delete-account') }),
]);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'invalid json');
  }

  // Branch: special actions ----------------------------------------------------
  const actionParse = ActionSchema.safeParse(body);
  if (actionParse.success) {
    return handleAction(req, actionParse.data);
  }

  // Branch: ingest a link ------------------------------------------------------
  const parse = IngestSchema.safeParse(body);
  if (!parse.success) {
    return errorResponse(400, parse.error.message);
  }

  let userId: string;
  let source = parse.data.source ?? 'manual';
  try {
    const auth = await authenticate(req);
    userId = auth.userId;
    if (auth.viaToken) source = source === 'manual' ? 'extension' : source;
  } catch (e) {
    return errorResponse(401, (e as Error).message);
  }

  const supa = serviceClient();
  const normalized = normalizeUrl(parse.data.url);

  const { data: existing } = await supa
    .from('links')
    .select('id, save_count')
    .eq('user_id', userId)
    .eq('normalized_url', normalized)
    .maybeSingle();

  if (existing) {
    await supa
      .from('links')
      .update({ save_count: existing.save_count + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return jsonResponse({ id: existing.id, duplicate: true });
  }

  const { data: inserted, error } = await supa
    .from('links')
    .insert({
      user_id: userId,
      url: parse.data.url,
      normalized_url: normalized,
      source,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !inserted) {
    return errorResponse(500, error?.message ?? 'insert failed');
  }

  // Kick off analyze-link without awaiting (best-effort fire-and-forget)
  invokeAnalyze(inserted.id).catch((e) => console.error('analyze invoke failed', e));

  return jsonResponse({ id: inserted.id, duplicate: false });
});

async function handleAction(req: Request, action: { action: 'create-extension-token' | 'delete-account'; label?: string }) {
  let userId: string;
  try {
    userId = (await authenticate(req)).userId;
  } catch (e) {
    return errorResponse(401, (e as Error).message);
  }
  const svc = serviceClient();

  if (action.action === 'create-extension-token') {
    const raw = `xn_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
    const hash = await sha256Hex(raw);
    const prefix = raw.slice(0, 12);
    const { error } = await svc.from('extension_tokens').insert({
      user_id: userId,
      token_hash: hash,
      token_prefix: prefix,
      label: action.label ?? 'Extension',
    });
    if (error) return errorResponse(500, error.message);
    return jsonResponse({ token: raw, prefix });
  }

  if (action.action === 'delete-account') {
    const { error } = await svc.auth.admin.deleteUser(userId);
    if (error) return errorResponse(500, error.message);
    return jsonResponse({ ok: true });
  }

  return errorResponse(400, 'unknown action');
}

async function invokeAnalyze(linkId: string): Promise<void> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-link`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ id: linkId }),
  });
}
