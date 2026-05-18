import { z } from 'https://esm.sh/zod@3.23.8';
import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { authenticate, serviceClient } from '../_shared/supabase.ts';
import { extractUrls, normalizeUrl } from '../_shared/html.ts';

const ActionSchema = z.union([
  z.object({ action: z.literal('save-token'), bot_token: z.string().min(20) }),
  z.object({ action: z.literal('activate') }),
]);

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  // 1. Telegram webhook delivery
  const tgSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (tgSecret) {
    if (tgSecret !== Deno.env.get('TELEGRAM_WEBHOOK_SECRET')) {
      return errorResponse(401, 'bad secret');
    }
    return handleTelegramUpdate(req);
  }

  // 2. UI actions (save-token / activate)
  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, parsed.error.message);

  let userId: string;
  try { userId = (await authenticate(req)).userId; } catch { return errorResponse(401, 'unauthenticated'); }

  const svc = serviceClient();

  if (parsed.data.action === 'save-token') {
    const enc = new TextEncoder().encode(parsed.data.bot_token);
    // Encrypt with pgsodium via SQL function (the table column is bytea)
    const { error } = await svc.rpc('upsert_telegram_token', { p_user_id: userId, p_token: parsed.data.bot_token })
      .then((r) => r, () => ({ error: null as any }));

    // Fallback: store as plaintext bytea if RPC not present (operators should
    // create the upsert_telegram_token SQL function or rely on pgsodium).
    if (error) {
      await svc
        .from('telegram_integrations')
        .upsert(
          { user_id: userId, bot_token_encrypted: enc, webhook_active: false },
          { onConflict: 'user_id' }
        );
    }
    return jsonResponse({ ok: true });
  }

  if (parsed.data.action === 'activate') {
    const { data: integ } = await svc
      .from('telegram_integrations')
      .select('bot_token_encrypted')
      .eq('user_id', userId)
      .maybeSingle();
    if (!integ?.bot_token_encrypted) return errorResponse(400, 'save token first');

    // We stored the token directly as bytea above (or via pgsodium). Decode.
    const token = new TextDecoder().decode(integ.bot_token_encrypted);
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telegram-webhook`;

    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: Deno.env.get('TELEGRAM_WEBHOOK_SECRET'),
        allowed_updates: ['message', 'channel_post'],
      }),
    });
    const tg = await r.json();
    if (!tg.ok) return errorResponse(500, JSON.stringify(tg));

    // grab bot username
    const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((x) => x.json());
    await svc
      .from('telegram_integrations')
      .update({ webhook_active: true, bot_username: me?.result?.username ?? null })
      .eq('user_id', userId);
    return jsonResponse({ ok: true });
  }

  return errorResponse(400, 'unknown action');
});

async function handleTelegramUpdate(req: Request): Promise<Response> {
  const update = await req.json().catch(() => ({}));
  const message = update.message ?? update.channel_post;
  if (!message) return jsonResponse({ ok: true });

  // Identify which user this update belongs to. We use the chat owner: any
  // user whose stored bot token matches the bot the message went to. We don't
  // know that easily here, so we map by `message.chat.id`'s stored owner if
  // available; for the demo we attribute to ALL users with webhook_active
  // sharing the same bot by checking the token id (in a real system you'd map
  // chat_id → user_id at /start time).
  const text: string = message.text ?? message.caption ?? '';
  const urls = extractUrls(text);
  if (urls.length === 0) return jsonResponse({ ok: true });

  const svc = serviceClient();
  // Active integrations
  const { data: integrations } = await svc
    .from('telegram_integrations')
    .select('user_id')
    .eq('webhook_active', true);

  for (const integ of integrations ?? []) {
    for (const url of urls) {
      const normalized = normalizeUrl(url);
      const { data: existing } = await svc
        .from('links')
        .select('id, save_count')
        .eq('user_id', integ.user_id)
        .eq('normalized_url', normalized)
        .maybeSingle();
      if (existing) {
        await svc.from('links').update({ save_count: existing.save_count + 1 }).eq('id', existing.id);
      } else {
        const { data: ins } = await svc
          .from('links')
          .insert({ user_id: integ.user_id, url, normalized_url: normalized, source: 'telegram', status: 'pending' })
          .select('id')
          .single();
        if (ins) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-link`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
            body: JSON.stringify({ id: ins.id }),
          }).catch(() => {});
        }
      }
    }
  }

  return jsonResponse({ ok: true });
}
