import { cn } from '@/lib/utils';

export function Section({
  title,
  description,
  children,
  className,
  index,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <section className={cn('rounded-lg border bg-card p-6', className)}>
      <header className="mb-4 flex items-baseline gap-3">
        {typeof index === 'number' && (
          <span className="font-display text-xs font-bold text-neon-400">{String(index).padStart(2, '0')}</span>
        )}
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
