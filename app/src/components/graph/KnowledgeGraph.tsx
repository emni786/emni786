import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { useUI } from '@/store/ui';
import { tagCoOccurrence } from '@/lib/stats';
import { clusterGraph, shortestPath } from './cluster';
import { THEMES, colorForGroup, type GraphTheme, type ThemeSpec } from './themes';
import type { Link as LinkRow } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Box,
  Boxes,
  Expand,
  GitBranch,
  History,
  Maximize,
  Minimize,
  Search as SearchIcon,
  Shrink,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getDomain } from '@/lib/utils';

// Lazy-load the heavy three.js bundles
const ForceGraph3D = lazy(() => import('react-force-graph-3d').then((m) => ({ default: m.default })));
const ForceGraph2D = lazy(() => import('react-force-graph-2d').then((m) => ({ default: m.default })));

interface Props {
  links: LinkRow[];
  fullscreen?: boolean;
  onFullscreenChange?: (b: boolean) => void;
}

export function KnowledgeGraph({ links, fullscreen, onFullscreenChange }: Props) {
  const graphTheme = useUI((s) => s.graphTheme);
  const setGraphTheme = useUI((s) => s.setGraphTheme);
  const graph3D = useUI((s) => s.graph3D);
  const setGraph3D = useUI((s) => s.setGraph3D);
  const [edgeThreshold, setEdgeThreshold] = useState(1);
  const [search, setSearch] = useState('');
  const [pathFrom, setPathFrom] = useState<string>('');
  const [pathTo, setPathTo] = useState<string>('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [timeBucket, setTimeBucket] = useState(100);
  const fgRef = useRef<any>(null);

  // Time-travel: only include links created up to the slider %
  const slicedLinks = useMemo(() => {
    if (timeBucket >= 100 || links.length === 0) return links;
    const sorted = [...links].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
    const cutoff = Math.max(1, Math.floor((sorted.length * timeBucket) / 100));
    return sorted.slice(0, cutoff);
  }, [links, timeBucket]);

  const { nodes, edges } = useMemo(() => {
    const co = tagCoOccurrence(slicedLinks, edgeThreshold);
    const clustered = clusterGraph(co.nodes, co.links);
    return { nodes: clustered, edges: co.links };
  }, [slicedLinks, edgeThreshold]);

  const theme = THEMES[graphTheme];
  const path = useMemo(() => {
    if (!pathFrom || !pathTo) return null;
    return shortestPath(nodes, edges, pathFrom, pathTo);
  }, [nodes, edges, pathFrom, pathTo]);
  const pathSet = new Set(path ?? []);

  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        size: n.size,
        group: n.group ?? 0,
        color: colorForGroup(theme, n.group ?? 0),
        highlighted: pathSet.has(n.id) || (search && n.id.toLowerCase().includes(search.toLowerCase())),
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        value: e.weight,
        active: pathSet.has(e.source) && pathSet.has(e.target),
      })),
    }),
    [nodes, edges, theme, pathSet, search]
  );

  const tagsForActive = useMemo(() => {
    if (!activeTag) return [];
    return slicedLinks.filter((l) => l.tags?.includes(activeTag));
  }, [activeTag, slicedLinks]);

  const stats = {
    nodes: nodes.length,
    edges: edges.length,
    density: nodes.length > 1 ? (2 * edges.length) / (nodes.length * (nodes.length - 1)) : 0,
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border',
        fullscreen ? 'h-[100dvh]' : 'h-[640px]'
      )}
      style={{ background: theme.bg }}
    >
      {theme.starfield && <div className="starfield-bg pointer-events-none absolute inset-0 opacity-50" />}

      <Suspense
        fallback={
          <div className="grid h-full place-items-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        }
      >
        {nodes.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Add some tagged links to see your knowledge graph.
          </div>
        ) : graph3D ? (
          <ForceGraph3D
            ref={fgRef}
            graphData={data}
            backgroundColor="rgba(0,0,0,0)"
            nodeLabel={(n: any) => `${n.id} (${n.size})`}
            nodeRelSize={4}
            nodeColor={(n: any) => (n.highlighted ? '#fff' : n.color)}
            nodeOpacity={0.95}
            nodeVal={(n: any) => n.size}
            linkColor={(l: any) => (l.active ? '#10b981' : 'rgba(255,255,255,0.18)')}
            linkOpacity={0.5}
            linkWidth={(l: any) => (l.active ? 2 : Math.min(2, Math.log2(1 + l.value)))}
            onNodeClick={(n: any) => setActiveTag(n.id)}
            warmupTicks={20}
            cooldownTicks={120}
          />
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={data}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={6}
            nodeColor={(n: any) => (n.highlighted ? '#fff' : n.color)}
            nodeLabel={(n: any) => `${n.id} (${n.size})`}
            linkColor={(l: any) => (l.active ? '#10b981' : 'rgba(255,255,255,0.18)')}
            linkWidth={(l: any) => (l.active ? 2 : Math.min(2, Math.log2(1 + l.value)))}
            onNodeClick={(n: any) => setActiveTag(n.id)}
            cooldownTicks={120}
          />
        )}
      </Suspense>

      {/* Top-right toolbar */}
      <div className="absolute right-3 top-3 flex flex-wrap items-center gap-2">
        <Tabs value={graphTheme} onValueChange={(v) => setGraphTheme(v as GraphTheme)}>
          <TabsList className="bg-black/40 backdrop-blur">
            {(Object.values(THEMES) as ThemeSpec[]).map((t) => (
              <TabsTrigger key={t.name} value={t.name} className="text-xs">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={() => setGraph3D(!graph3D)}>
          {graph3D ? <Box className="h-3.5 w-3.5" /> : <Boxes className="h-3.5 w-3.5" />}
          {graph3D ? '3D' : '2D'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => onFullscreenChange?.(!fullscreen)}>
          {fullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/40 p-3 text-[11px] text-white/85 backdrop-blur">
        <p className="mb-1 font-display text-xs uppercase tracking-widest text-white/70">Legend</p>
        <p>● size = link count (Few · Some · Many)</p>
        <p>● colour = topic cluster</p>
        <p>● rings = connections</p>
        <p>● lines = tag co-occurrence</p>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute bottom-3 left-3 right-3 grid gap-2 rounded-lg bg-black/55 p-3 text-xs text-white/85 backdrop-blur md:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/60">
            <SearchIcon className="h-3 w-3" /> Search
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="jump to a tag…"
            className="mt-1 h-8 border-white/10 bg-white/10 text-xs text-white placeholder:text-white/40"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/60">
            <History className="h-3 w-3" /> Time travel
          </label>
          <Slider
            min={5}
            max={100}
            step={5}
            value={[timeBucket]}
            onValueChange={(v) => setTimeBucket(v[0])}
            className="mt-3"
          />
          <p className="mt-0.5 text-[10px] text-white/50">First {timeBucket}% of saves</p>
        </div>
        <div>
          <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-white/60">
            <GitBranch className="h-3 w-3" /> Path finder
          </label>
          <div className="mt-1 flex gap-1">
            <Input
              value={pathFrom}
              onChange={(e) => setPathFrom(e.target.value)}
              placeholder="from"
              className="h-8 border-white/10 bg-white/10 text-xs text-white placeholder:text-white/40"
            />
            <Input
              value={pathTo}
              onChange={(e) => setPathTo(e.target.value)}
              placeholder="to"
              className="h-8 border-white/10 bg-white/10 text-xs text-white placeholder:text-white/40"
            />
          </div>
        </div>
        <div className="grid gap-1 text-right text-[11px]">
          <span>min edge weight</span>
          <Slider min={1} max={5} step={1} value={[edgeThreshold]} onValueChange={(v) => setEdgeThreshold(v[0])} />
          <span className="text-white/50">
            {stats.nodes} nodes · {stats.edges} edges · density {(stats.density * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Tag side panel */}
      <Sheet open={!!activeTag} onOpenChange={(open) => !open && setActiveTag(null)}>
        <SheetContent side="right" className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">#{activeTag}</SheetTitle>
          </SheetHeader>
          <p className="mt-1 text-xs text-muted-foreground">{tagsForActive.length} link(s) carry this tag</p>
          <div className="mt-3 max-h-[80vh] space-y-2 overflow-auto pr-1">
            {tagsForActive.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md border p-2 text-sm transition-colors hover:bg-accent"
              >
                <p className="truncate font-medium">{l.title || l.url}</p>
                <p className="truncate text-xs text-muted-foreground">{getDomain(l.url)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {l.tags?.slice(0, 5).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

