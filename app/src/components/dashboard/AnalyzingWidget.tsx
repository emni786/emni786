import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDomain } from '@/lib/utils';
import type { Link } from '@/types/database';

export function AnalyzingWidget({ links }: { links: Link[] }) {
  const analyzing = links.filter((l) => l.status === 'analyzing' || l.status === 'pending');
  if (analyzing.length === 0) return null;
  return (
    <Card className="border-neon-500/30 bg-neon-500/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-neon-300" />
          Analyzing {analyzing.length}
        </CardTitle>
        <Dots />
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {analyzing.slice(0, 5).map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 truncate text-sm">
            <span className="truncate text-muted-foreground">{l.title || l.url}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{getDomain(l.url)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-neon-400 animate-bounce-dot"
          style={{ animationDelay: `${i * 120}ms`, background: i % 2 ? '#34d399' : '#10b981' }}
        />
      ))}
    </span>
  );
}
