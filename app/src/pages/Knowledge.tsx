import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass,
  Flame,
  GitGraph,
  History,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { useLinks } from '@/hooks/useLinks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph';
import { callFunction, supabase } from '@/lib/supabase';
import { topTags, contentMix } from '@/lib/stats';
import { formatRelative, getDomain, getFavicon } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Recommendation, TrendingSnapshot } from '@/types/database';

const TIME_CHIPS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: '3m', label: '3 Months' },
  { id: 'all', label: 'All' },
];
const TOPIC_CHIPS = ['AI', 'Dev', 'OSS', 'Startups'];

export default function Knowledge() {
  const { data: links = [], isLoading } = useLinks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Knowledge Discovery</h1>
        <p className="text-sm text-muted-foreground">
          Find patterns, trends, and your next great read across your library.
        </p>
      </div>

      <Tabs defaultValue="trending" className="w-full">
        <TabsList>
          <TabsTrigger value="trending"><Flame className="mr-1 h-3.5 w-3.5" /> Trending</TabsTrigger>
          <TabsTrigger value="recent"><History className="mr-1 h-3.5 w-3.5" /> Recently Updated</TabsTrigger>
          <TabsTrigger value="valuable"><Star className="mr-1 h-3.5 w-3.5" /> Most Valuable</TabsTrigger>
          <TabsTrigger value="graph"><GitGraph className="mr-1 h-3.5 w-3.5" /> Graph</TabsTrigger>
          <TabsTrigger value="for-you"><Sparkles className="mr-1 h-3.5 w-3.5" /> For You</TabsTrigger>
        </TabsList>

        <TabsContent value="trending"><TrendingTab /></TabsContent>
        <TabsContent value="recent"><RecentTab links={links} /></TabsContent>
        <TabsContent value="valuable"><ValuableTab links={links} /></TabsContent>
        <TabsContent value="graph">
          {isLoading ? (
            <Skeleton className="h-[640px] w-full rounded-xl" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Drag to orbit · scroll to zoom · click any node to see linked items.
                </p>
                <Button asChild size="sm" variant="outline">
                  <RouterLink to="/knowledge/graph">
                    <Compass className="h-3.5 w-3.5" /> Open fullscreen
                  </RouterLink>
                </Button>
              </div>
              <KnowledgeGraph links={links} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="for-you"><ForYouTab links={links} /></TabsContent>
      </Tabs>
    </div>
  );
}

function TrendingTab() {
  const [period, setPeriod] = useState('today');
  const [topic, setTopic] = useState<string>('AI');
  const [scope, setScope] = useState<'global' | 'user'>('global');
  const [busy, setBusy] = useState(false);

  const { data: snapshot, refetch } = useQuery<TrendingSnapshot | null>({
    queryKey: ['trending', period, topic, scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trending_snapshots')
        .select('*')
        .eq('scope', scope)
        .eq('period', period)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function fetchTrending() {
    setBusy(true);
    try {
      await callFunction('ai-discover', { mode: 'trending', period, topic, scope });
      toast.success('Trending refreshed');
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TIME_CHIPS.map((c) => (
          <Chip key={c.id} active={period === c.id} onClick={() => setPeriod(c.id)}>{c.label}</Chip>
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        {TOPIC_CHIPS.map((t) => (
          <Chip key={t} active={topic === t} onClick={() => setTopic(t)}>{t}</Chip>
        ))}
        <span className="mx-2 h-5 w-px bg-border" />
        <Tabs value={scope} onValueChange={(v) => setScope(v as 'global' | 'user')}>
          <TabsList>
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="user">My library</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-amber-300" /> Real-Time Trending Analysis
          </CardTitle>
          <Button onClick={fetchTrending} disabled={busy}>
            {busy ? '…' : 'Fetch Trending'}
          </Button>
        </CardHeader>
        <CardContent>
          {!snapshot && (
            <p className="text-sm text-muted-foreground">No snapshot yet. Click "Fetch Trending" to ask the AI.</p>
          )}
          {snapshot && (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                generated {formatRelative(snapshot.generated_at)} · {snapshot.period}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {snapshot.topics.map((t) => (
                  <Badge key={t.topic} title={t.reason}>{t.topic}</Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? 'border-neon-500 bg-neon-500/10 text-neon-300' : 'text-muted-foreground hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}

function RecentTab({ links }: { links: any[] }) {
  const sorted = [...links].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)).slice(0, 30);
  return <LinkList links={sorted} />;
}

function ValuableTab({ links }: { links: any[] }) {
  const valuable = links
    .filter((l) => l.is_pinned || l.save_count >= 2)
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.save_count - a.save_count);
  return <LinkList links={valuable} />;
}

function ForYouTab({ links }: { links: any[] }) {
  const tags = topTags(links, 6);
  const mix = contentMix(links);
  const qc = useQueryClient();

  const { data: recs = [] } = useQuery<Recommendation[]>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .is('dismissed_at', null)
        .order('score', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function dismiss(id: string) {
    await supabase.from('recommendations').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['recommendations'] });
  }

  async function generate() {
    try {
      await callFunction('generate-recommendations');
      toast.success('Generating recommendations…');
      setTimeout(() => qc.invalidateQueries({ queryKey: ['recommendations'] }), 1500);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">For you</CardTitle>
          <Button onClick={generate}>Generate Recommendations</Button>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            Based on your top tags ({tags.slice(0, 4).map((t) => t.tag).join(', ') || 'none yet'}) and
            recent saves across {mix.length} content type(s).
          </p>
          {recs.length === 0 && <p className="text-sm text-muted-foreground">No recommendations yet.</p>}
          <div className="space-y-2">
            {recs.map((r) => (
              <motion.div
                key={r.id}
                layout
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <a href={r.url ?? '#'} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title || r.url}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.reason}</p>
                </a>
                <Button size="iconSm" variant="ghost" onClick={() => dismiss(r.id)} title="Dismiss">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LinkList({ links }: { links: any[] }) {
  if (links.length === 0) return <p className="text-sm text-muted-foreground">No links match.</p>;
  return (
    <div className="space-y-2">
      {links.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
        >
          <img src={l.favicon || getFavicon(l.url)} alt="" className="h-4 w-4 rounded" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{l.title || l.url}</p>
            <p className="truncate text-xs text-muted-foreground">
              {getDomain(l.url)} · {formatRelative(l.updated_at)}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {l.tags?.slice(0, 3).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}
