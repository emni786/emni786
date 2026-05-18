import { BookOpen, FolderKanban, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountUp } from '@/components/common/CountUp';
import type { DashboardStats } from '@/lib/stats';

export function StatCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: 'Total Links', icon: BookOpen, value: stats.total, color: 'text-neon-300' },
    { label: 'This Week', icon: Sparkles, value: stats.thisWeek, color: 'text-amber-300' },
    { label: 'Collections', icon: FolderKanban, value: stats.collections, color: 'text-sky-300' },
    { label: 'Day Streak', icon: Calendar, value: stats.streak, color: 'text-fuchsia-300' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {c.label}
            </CardTitle>
            <c.icon className={c.color} />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <CountUp value={c.value} className="font-display text-3xl font-bold" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
