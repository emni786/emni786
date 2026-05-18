import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callFunction } from '@/lib/supabase';
import type { Link } from '@/types/database';
import { toast } from 'sonner';
import { Link as RouterLink } from 'react-router-dom';
import { getDomain } from '@/lib/utils';

const SUGGESTIONS = [
  'React testing article from last week',
  'AI tools for image generation',
  'TypeScript performance tips',
  'open-source rust web frameworks',
];

export function SmartSearchModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Link[]>([]);

  async function run(query: string) {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const data = await callFunction<{ results: Link[] }>('ai-smart-search', { query });
      setResults(data.results ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon-300" /> AI Smart Search
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="e.g. React testing article from last week"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQ(s);
                run(s);
              }}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="max-h-80 space-y-2 overflow-auto">
          {results.length === 0 && !busy && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Natural-language search across summary, tags, and content.
            </p>
          )}
          {results.map((l) => (
            <RouterLink
              key={l.id}
              to={`/library/${l.id}`}
              onClick={() => onOpenChange(false)}
              className="flex items-start gap-2 rounded-md border p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.title || l.url}</p>
                <p className="truncate text-xs text-muted-foreground">{l.summary || getDomain(l.url)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {l.tags?.slice(0, 4).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </RouterLink>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
