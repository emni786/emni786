import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLinks } from '@/hooks/useLinks';
import {
  buildHeatmap,
  computeLongestStreak,
  computeStats,
  contentMix,
  topDomains,
  topTags,
  buildHeatmap as _bh,
} from '@/lib/stats';
import { CountUp } from '@/components/common/CountUp';
import { HeatmapGrid } from '@/components/common/HeatmapGrid';
import {
  ContentTypesDonut,
  LinksOverTimeChart,
  TopTagsBar,
  WeeklyPatternRadar,
} from '@/components/dashboard/DashboardCharts';
import { callFunction } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Link } from '@/types/database';

const RANGES = [
  { id: '7d', label: '7d', days: 7 },
  { id: '14d', label: '14d', days: 14 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
  { id: 'all', label: 'All', days: 9999 },
];

export default function Analytics() {
  const { data: links = [], isLoading } = useLinks();
  const [range, setRange] = useState('30d');
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const days = RANGES.find((r) => r.id === range)?.days ?? 30;
  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 86400_000;
    return days >= 9999 ? links : links.filter((l) => new Date(l.created_at).getTime() >= cutoff);
  }, [links, days]);

  const stats = computeStats(filtered, 0);
  const longest = computeLongestStreak(filtered);
  const perDay = (filtered.length / Math.max(1, Math.min(days, daysSinceFirst(filtered)))).toFixed(1);

  async function generateReport() {
    setBusy(true);
    try {
      const r = await callFunction<{ report: string }>('ai-discover', { mode: 'knowledge-report' });
      setReport(r.report);
      toast.success('Report ready');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <Skeleton className="h-screen w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Insights about your reading and saving habits.</p>
        </div>
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.id} value={r.id}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Ready" value={stats.ready} />
        <StatCard label="Pending" value={stats.pending + stats.analyzing} />
        <StatCard label="Failed" value={stats.failed} />
        <StatCard label="Streak" value={stats.streak} suffix="d" />
        <StatCard label="Per day" value={Number(perDay)} digits={1} />
      </div>

      <ReadingActivity52w links={links} longest={longest} />

      <Activity12w links={filtered} />

      <div className="grid gap-3 lg:grid-cols-2">
        <LinksOverTimeChart links={filtered} />
        <TopTagsBar links={filtered} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ContentTypesDonut links={filtered} />
        <WeeklyPatternRadar links={filtered} />
        <TopDomainsTable links={filtered} />
      </div>

      <TagCloud links={filtered} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-neon-300" />
            AI Knowledge Report
          </CardTitle>
          <Button onClick={generateReport} disabled={busy}>
            {busy ? 'Generating…' : report ? 'Regenerate' : 'Generate'}
          </Button>
        </CardHeader>
        <CardContent>
          {!report ? (
            <p className="text-sm text-muted-foreground">
              Get a narrative summary of your reading habits, blind spots, and what to read next.
            </p>
          ) : (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm">{report}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function daysSinceFirst(links: Link[]): number {
  if (links.length === 0) return 1;
  const first = links.reduce((m, l) => (l.created_at < m ? l.created_at : m), links[0].created_at);
  return Math.max(1, Math.ceil((Date.now() - new Date(first).getTime()) / 86400_000));
}

function StatCard({ label, value, suffix, digits = 0 }: { label: string; value: number; suffix?: string; digits?: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <span className="font-display text-2xl font-bold">
          {digits ? value.toFixed(digits) : <CountUp value={value} />}
          {suffix && <span className="ml-0.5 text-base text-muted-foreground">{suffix}</span>}
        </span>
      </CardContent>
    </Card>
  );
}

function ReadingActivity52w({ links, longest }: { links: Link[]; longest: number }) {
  const data = buildHeatmap(links, 52 * 7);
  const activeDays = data.filter((d) => d.count > 0).length;
  const articles = links.length;
  const current = computeStats(links, 0).streak;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reading Activity (52 Weeks)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Current {current}d · Longest {longest}d · {activeDays} active days · {articles} articles read
        </p>
      </CardHeader>
      <CardContent>
        <HeatmapGrid data={data} weeks={52} showMonthLabels />
      </CardContent>
    </Card>
  );
}

function Activity12w({ links }: { links: Link[] }) {
  const data = buildHeatmap(links, 12 * 7);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Heatmap (12 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <HeatmapGrid data={data} weeks={12} />
      </CardContent>
    </Card>
  );
}

function TopDomainsTable({ links }: { links: Link[] }) {
  const data = topDomains(links, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Domains</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Domain</th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Links</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.domain} className="border-b last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{d.domain}</td>
                <td className="px-4 py-2 text-right font-mono">{d.count}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-center text-muted-foreground" colSpan={2}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TagCloud({ links }: { links: Link[] }) {
  const tags = topTags(links, 60);
  if (tags.length === 0) return null;
  const max = tags[0].count;
  const min = tags[tags.length - 1].count;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tag Cloud</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {tags.map((t) => {
            const t01 = max === min ? 0.5 : (t.count - min) / (max - min);
            const size = 0.85 + t01 * 1.1;
            return (
              <span key={t.tag} style={{ fontSize: `${size}rem`, color: `rgba(16,185,129,${0.5 + t01 * 0.5})` }}>
                {t.tag}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
