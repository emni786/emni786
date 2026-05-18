import { Link } from 'react-router-dom';
import { Library, Compass, BarChart3, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const tiles = [
  { to: '/library', label: 'My Library', icon: Library, blurb: 'Everything you saved.' },
  { to: '/knowledge', label: 'Knowledge', icon: Compass, blurb: 'Discover and graph.' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, blurb: 'Insights about your reading.' },
  { to: '/digest', label: 'Digest', icon: Mail, blurb: 'Curated summaries.' },
];

export function NavTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={cn(
            'group relative overflow-hidden rounded-xl border bg-card p-5 transition-colors hover:border-neon-500/40 hover:bg-neon-500/5'
          )}
        >
          <t.icon className="h-6 w-6 text-neon-300 transition-transform group-hover:scale-110" />
          <p className="mt-3 font-display text-base font-bold">{t.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
        </Link>
      ))}
    </div>
  );
}
