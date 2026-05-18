import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { formatRelative, getFavicon, getDomain } from '@/lib/utils';
import type { Link as LinkRow } from '@/types/database';

export function RecentActivity({ links }: { links: LinkRow[] }) {
  const recent = [...links]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recent.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet.</p>}
        {recent.map((l) => (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
          >
            <img src={l.favicon || getFavicon(l.url)} alt="" className="h-4 w-4 rounded" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{l.title || l.url}</p>
              <p className="truncate text-xs text-muted-foreground">
                {getDomain(l.url)} · {formatRelative(l.created_at)}
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
