import type { ContentType, Link } from '@/types/database';

export interface DashboardStats {
  total: number;
  thisWeek: number;
  collections: number;
  streak: number;
  ready: number;
  pending: number;
  analyzing: number;
  failed: number;
}

export function computeStats(links: Link[], collectionsCount: number): DashboardStats {
  const now = Date.now();
  const weekAgo = now - 7 * 86400_000;
  const thisWeek = links.filter((l) => new Date(l.created_at).getTime() > weekAgo).length;
  return {
    total: links.length,
    thisWeek,
    collections: collectionsCount,
    streak: computeStreak(links),
    ready: links.filter((l) => l.status === 'ready').length,
    pending: links.filter((l) => l.status === 'pending').length,
    analyzing: links.filter((l) => l.status === 'analyzing').length,
    failed: links.filter((l) => l.status === 'failed').length,
  };
}

export function computeStreak(links: Link[]): number {
  if (links.length === 0) return 0;
  const days = new Set(links.map((l) => l.created_at.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Allow today to be missing without breaking the streak
      if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

export function computeLongestStreak(links: Link[]): number {
  if (links.length === 0) return 0;
  const days = Array.from(new Set(links.map((l) => l.created_at.slice(0, 10)))).sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    const a = new Date(days[i - 1]).getTime();
    const b = new Date(days[i]).getTime();
    if ((b - a) / 86400_000 === 1) current += 1;
    else current = 1;
    if (current > best) best = current;
  }
  return best;
}

export function topTags(links: Link[], limit = 8): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  links.forEach((l) => l.tags?.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function contentMix(links: Link[]): { type: ContentType; count: number }[] {
  const counts = new Map<ContentType, number>();
  links.forEach((l) => counts.set(l.content_type, (counts.get(l.content_type) ?? 0) + 1));
  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

export function topDomains(links: Link[], limit = 10): { domain: string; count: number }[] {
  const counts = new Map<string, number>();
  links.forEach((l) => {
    try {
      const host = new URL(l.url).hostname.replace(/^www\./, '');
      counts.set(host, (counts.get(host) ?? 0) + 1);
    } catch {
      /* ignore */
    }
  });
  return Array.from(counts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function dayOfWeekActivity(links: Link[]): { day: string; count: number }[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = new Array(7).fill(0);
  links.forEach((l) => {
    buckets[new Date(l.created_at).getDay()] += 1;
  });
  return labels.map((day, i) => ({ day, count: buckets[i] }));
}

export function buildHeatmap(links: Link[], days: number): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  links.forEach((l) => {
    const k = l.created_at.slice(0, 10);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function linksOverTime(links: Link[], days = 30) {
  const series = buildHeatmap(links, days);
  return series.map((p) => ({ date: p.date.slice(5), count: p.count }));
}

export function tagCoOccurrence(
  links: Link[],
  minWeight = 1
): { nodes: { id: string; size: number }[]; links: { source: string; target: string; weight: number }[] } {
  const nodeCount = new Map<string, number>();
  const edgeCount = new Map<string, number>();
  links.forEach((l) => {
    const tags = (l.tags ?? []).slice(0, 12);
    tags.forEach((t) => nodeCount.set(t, (nodeCount.get(t) ?? 0) + 1));
    for (let i = 0; i < tags.length; i += 1) {
      for (let j = i + 1; j < tags.length; j += 1) {
        const a = tags[i];
        const b = tags[j];
        if (a === b) continue;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      }
    }
  });
  const nodes = Array.from(nodeCount.entries()).map(([id, size]) => ({ id, size }));
  const linksOut = Array.from(edgeCount.entries())
    .filter(([, w]) => w >= minWeight)
    .map(([key, w]) => {
      const [source, target] = key.split('|');
      return { source, target, weight: w };
    });
  return { nodes, links: linksOut };
}
