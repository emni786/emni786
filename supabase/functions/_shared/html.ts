// Lightweight HTML metadata extraction without DOMParser — works in Deno.

const META = /<meta\s+[^>]*?(?:name|property)=["']([^"']+)["'][^>]*?content=["']([^"']*)["'][^>]*>/gi;
const TITLE = /<title[^>]*>([^<]*)<\/title>/i;
const FAVICON =
  /<link\s+[^>]*?rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*?href=["']([^"']+)["'][^>]*>/i;

export interface PageMeta {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  favicon: string | null;
  text: string;
}

export async function fetchPageMeta(url: string): Promise<PageMeta> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 Xenonowledge/1.0 (+https://xenonowledge.app)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      return { title: null, description: null, ogImage: null, favicon: null, text: '' };
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('xhtml')) {
      return { title: null, description: null, ogImage: null, favicon: null, text: '' };
    }
    const html = (await res.text()).slice(0, 800_000);

    const meta = new Map<string, string>();
    for (const match of html.matchAll(META)) {
      meta.set(match[1].toLowerCase(), decodeEntities(match[2]));
    }
    const titleM = TITLE.exec(html);
    const faviconM = FAVICON.exec(html);

    const text = stripHtml(html).slice(0, 8000);

    return {
      title:
        meta.get('og:title') ??
        meta.get('twitter:title') ??
        (titleM ? decodeEntities(titleM[1]) : null),
      description:
        meta.get('og:description') ??
        meta.get('description') ??
        meta.get('twitter:description') ??
        null,
      ogImage: absolutize(url, meta.get('og:image') ?? meta.get('twitter:image') ?? null),
      favicon: absolutize(url, faviconM?.[1] ?? '/favicon.ico'),
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)));
}

export function absolutize(base: string, href: string | null): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input.trim());
    u.hash = '';
    [...u.searchParams.keys()].forEach((k) => {
      if (/^utm_/i.test(k) || k === 'fbclid' || k === 'gclid') u.searchParams.delete(k);
    });
    let s = u.toString().toLowerCase();
    if (s.endsWith('/')) s = s.slice(0, -1);
    return s;
  } catch {
    return input.trim().toLowerCase();
  }
}

export function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"']+/gi;
  return Array.from(new Set(text.match(re) ?? []));
}
