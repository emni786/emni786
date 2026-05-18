import { errorResponse, handleCors, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Xenonowledge <noreply@example.com>';

interface DigestSettingsRow {
  user_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  email_enabled: boolean;
  last_sent_at: string | null;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return errorResponse(405, 'method not allowed');

  const body = await req.json().catch(() => ({}));
  const force = !!body.force;

  const svc = serviceClient();
  const { data: settings } = await svc.from('digest_settings').select('*').eq('email_enabled', true);
  if (!settings) return jsonResponse({ sent: 0 });

  let sent = 0;
  for (const s of settings as DigestSettingsRow[]) {
    if (!force && !isDue(s)) continue;
    try {
      await sendForUser(s.user_id, s.frequency, svc);
      sent += 1;
    } catch (e) {
      console.error('digest failed', s.user_id, (e as Error).message);
    }
  }
  return jsonResponse({ sent });
});

function isDue(s: DigestSettingsRow): boolean {
  if (!s.last_sent_at) return true;
  const since = (Date.now() - new Date(s.last_sent_at).getTime()) / 86400_000;
  return s.frequency === 'daily' ? since >= 1 : s.frequency === 'weekly' ? since >= 7 : since >= 28;
}

async function sendForUser(userId: string, frequency: DigestSettingsRow['frequency'], svc: ReturnType<typeof serviceClient>) {
  const days = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data: links } = await svc
    .from('links')
    .select('title, url, summary, tags, created_at, content_type')
    .eq('user_id', userId)
    .gte('created_at', since)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: profile } = await svc.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  const { data: { user } } = await svc.auth.admin.getUserById(userId);
  if (!user?.email) return;

  const html = renderHtml({
    name: profile?.display_name ?? user.email.split('@')[0],
    period: frequency,
    links: links ?? [],
  });

  if (RESEND_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [user.email],
        subject: `Your ${frequency} Xenonowledge digest`,
        html,
      }),
    });
    if (!r.ok) throw new Error('resend: ' + (await r.text()));
  } else {
    console.log('[send-digest] RESEND_API_KEY not set — would send to', user.email);
  }

  await svc.from('digest_settings').update({ last_sent_at: new Date().toISOString() }).eq('user_id', userId);
  await svc.from('digest_history').insert({
    user_id: userId,
    period_start: since,
    period_end: new Date().toISOString(),
    summary_json: { count: links?.length ?? 0 },
  });
}

function renderHtml(opts: { name: string; period: string; links: any[] }): string {
  const items = opts.links
    .map(
      (l) => `
      <li style="margin-bottom:14px">
        <a href="${escape(l.url)}" style="color:#10b981;text-decoration:none;font-weight:600">${escape(l.title ?? l.url)}</a>
        <div style="color:#666;font-size:12px">${escape((l.tags ?? []).slice(0, 5).join(' · '))}</div>
        <div style="color:#aaa;font-size:13px">${escape((l.summary ?? '').slice(0, 220))}</div>
      </li>`
    )
    .join('');
  return `<!doctype html><html><body style="background:#0a0a0c;color:#eee;font-family:Inter,system-ui,sans-serif;margin:0;padding:24px">
    <h1 style="font-family:'JetBrains Mono',monospace;color:#10b981">Hi ${escape(opts.name)} 👋</h1>
    <p>Here's your ${escape(opts.period)} digest from Xenonowledge.</p>
    <ul style="list-style:none;padding:0">${items || '<li style="color:#888">Nothing this period.</li>'}</ul>
    <p style="color:#666;font-size:11px">You can change the cadence or unsubscribe in Settings → Digest.</p>
  </body></html>`;
}
function escape(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}
