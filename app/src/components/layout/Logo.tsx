import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'flex items-center gap-2 font-display text-lg font-bold tracking-tight',
        className
      )}
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-neon-500/15 ring-1 ring-neon-500/40">
        <span className="absolute inset-0 rounded-md bg-neon-500/20 blur-md" />
        <span className="relative font-mono text-neon-300">⌬</span>
      </span>
      <span className="gradient-text">Xenonowledge</span>
    </Link>
  );
}
