import { Link as RouterLink } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { topTags } from '@/lib/stats';
import { Button } from '@/components/ui/button';
import type { Link } from '@/types/database';
import { cn } from '@/lib/utils';

const COLORS = ['#10b981', '#34d399', '#06b6d4', '#0ea5e9', '#a78bfa', '#f472b6', '#f59e0b', '#ef4444'];

export function KnowledgeAtoms({ links }: { links: Link[] }) {
  const tags = topTags(links, 24);
  const max = tags[0]?.count ?? 1;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-neon-500/10 via-background to-background p-6 lg:p-8">
      <div className="starfield-bg absolute inset-0 opacity-30" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add a few links and your knowledge atoms will start appearing here.
            </p>
          )}
          {tags.map((t, i) => {
            const size = 0.8 + (t.count / max) * 1.6;
            const color = COLORS[i % COLORS.length];
            return (
              <div
                key={t.tag}
                className={cn(
                  'group relative inline-flex items-center justify-center rounded-full px-3 py-1 font-medium transition-transform hover:scale-110'
                )}
                style={{
                  fontSize: `${size}rem`,
                  background: `radial-gradient(circle at 30% 30%, ${color}33, ${color}11)`,
                  border: `1px solid ${color}55`,
                  boxShadow: `0 0 24px -8px ${color}88`,
                }}
              >
                <span style={{ color }}>{t.tag}</span>
                <span className="ml-2 text-xs text-muted-foreground">{t.count}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          <Button variant="secondary" asChild>
            <RouterLink to="/library">
              Read all
              <ArrowRight className="h-3.5 w-3.5" />
            </RouterLink>
          </Button>
          <Button variant="outline" asChild>
            <RouterLink to="/knowledge/graph">Full graph →</RouterLink>
          </Button>
        </div>
      </div>
    </div>
  );
}
