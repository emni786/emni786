import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export function HeatmapGrid({
  data,
  weeks,
  className,
  showMonthLabels = false,
}: {
  data: { date: string; count: number }[];
  weeks: number;
  className?: string;
  showMonthLabels?: boolean;
}) {
  const cells = useMemo(() => {
    // pad start so that the first column starts on a Sunday
    const sorted = [...data].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (sorted.length === 0) return [];
    const first = new Date(sorted[0].date + 'T00:00:00Z');
    const startDow = first.getUTCDay();
    return [
      ...Array.from({ length: startDow }, () => ({ date: '', count: -1 })),
      ...sorted,
    ];
  }, [data]);

  const max = Math.max(1, ...cells.map((c) => c.count));
  const monthLabels: { col: number; label: string }[] = [];
  if (showMonthLabels) {
    let lastMonth = -1;
    cells.forEach((c, i) => {
      if (!c.date) return;
      const m = new Date(c.date).getUTCMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col: Math.floor(i / 7), label: new Date(c.date).toLocaleString(undefined, { month: 'short' }) });
        lastMonth = m;
      }
    });
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {showMonthLabels && (
        <div
          className="grid gap-[3px] text-[10px] text-muted-foreground"
          style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: weeks }).map((_, i) => {
            const ml = monthLabels.find((m) => m.col === i);
            return <span key={i}>{ml?.label ?? ''}</span>;
          })}
        </div>
      )}
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
      >
        {cells.map((c, i) => {
          const intensity = c.count <= 0 ? 0 : Math.min(1, c.count / max);
          const bg =
            c.count < 0
              ? 'transparent'
              : c.count === 0
                ? 'rgba(255,255,255,0.04)'
                : `rgba(16,185,129,${0.15 + intensity * 0.85})`;
          return (
            <div
              key={i}
              title={c.date ? `${c.date}: ${c.count}` : ''}
              className="aspect-square rounded-sm"
              style={{ background: bg }}
            />
          );
        })}
      </div>
    </div>
  );
}
