import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats } from '@/lib/stats';

export function StatusBars({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: 'Ready', value: stats.ready, color: 'bg-neon-500' },
    { label: 'Pending', value: stats.pending + stats.analyzing, color: 'bg-amber-400' },
    { label: 'Failed', value: stats.failed, color: 'bg-rose-500' },
  ];
  const total = Math.max(1, items.reduce((s, i) => s + i.value, 0));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Link Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => (
          <div key={it.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{it.label}</span>
              <span className="font-mono">{it.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`${it.color} h-full transition-all`} style={{ width: `${(it.value / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
