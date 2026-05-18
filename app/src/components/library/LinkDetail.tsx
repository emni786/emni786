import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy as CopyIcon,
  ExternalLink,
  Pin,
  PinOff,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLink, useSoftDeleteLink, useTogglePin, useUpdateLink } from '@/hooks/useLinks';
import { formatRelative, getDomain, getFavicon } from '@/lib/utils';
import { toast } from 'sonner';

export function LinkDetail({ id }: { id: string }) {
  const { data: link, isLoading } = useLink(id);
  const update = useUpdateLink();
  const del = useSoftDeleteLink();
  const togglePin = useTogglePin();
  const navigate = useNavigate();

  const [notes, setNotes] = useState(link?.notes ?? '');
  const [tags, setTags] = useState<string[]>(link?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setNotes(link?.notes ?? '');
    setTags(link?.tags ?? []);
  }, [link]);

  // Esc to close (handled by Sheet, but also returns focus)
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/library');
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [navigate]);

  function close() {
    navigate('/library');
  }

  async function saveNotes() {
    await update.mutateAsync({ id, notes });
    toast.success('Notes saved');
  }
  async function saveTags(next: string[]) {
    setTags(next);
    await update.mutateAsync({ id, tags: next });
  }

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full max-w-2xl overflow-y-auto">
        {isLoading || !link ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-start gap-3">
                <img src={link.favicon || getFavicon(link.url)} alt="" className="mt-1 h-5 w-5 rounded" />
                <div className="flex-1">
                  <SheetTitle className="font-display text-xl leading-snug">{link.title || link.url}</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {getDomain(link.url)} · Saved {link.save_count}× · Created {formatRelative(link.created_at)} ·
                    Updated {formatRelative(link.updated_at)}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="info">{link.content_type}</Badge>
              <Badge variant="outline">confidence {Math.round((link.confidence ?? 0) * 100)}%</Badge>
              <Badge variant={link.status === 'ready' ? 'default' : 'warning'}>{link.status}</Badge>
              {link.source && <Badge variant="secondary">via {link.source}</Badge>}
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild>
                <a href={link.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(link.url);
                  toast.success('Copied');
                }}
              >
                <CopyIcon className="h-4 w-4" /> Copy URL
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await togglePin.mutateAsync({ id: link.id, is_pinned: !link.is_pinned });
                }}
              >
                {link.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {link.is_pinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  toast.message('Finding similar… open the smart-search modal for full results.');
                }}
              >
                <Sparkles className="h-4 w-4" /> Find Similar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!confirm('Move to recycle bin?')) return;
                  await del.mutateAsync(link.id);
                  toast.success('Moved to recycle bin');
                  close();
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>

            {/* Summary + key points */}
            {link.summary && (
              <section className="mt-6">
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Summary</h3>
                <p className="text-sm leading-relaxed">{link.summary}</p>
              </section>
            )}
            {link.key_points?.length > 0 && (
              <section className="mt-4">
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Key points</h3>
                <ul className="space-y-1.5">
                  {link.key_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neon-500" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tags */}
            <section className="mt-6">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => saveTags(tags.filter((x) => x !== t))}
                    className="group inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs hover:bg-destructive/20"
                  >
                    {t}
                    <X className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
                <Input
                  className="h-7 w-32 text-xs"
                  placeholder="add tag…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault();
                      const next = Array.from(new Set([...tags, tagInput.trim().toLowerCase()]));
                      saveTags(next);
                      setTagInput('');
                    }
                  }}
                />
              </div>
            </section>

            {/* URL */}
            <section className="mt-6">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">URL</h3>
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs font-mono">
                <span className="flex-1 break-all">{link.url}</span>
              </div>
            </section>

            {/* Notes */}
            <section className="mt-6">
              <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
              <Button size="sm" className="mt-2" onClick={saveNotes}>
                Save notes
              </Button>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
