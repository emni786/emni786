import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLinks } from '@/hooks/useLinks';
import { useUI } from '@/store/ui';
import { LibrarySidebar } from '@/components/library/LibrarySidebar';
import { LibraryTopBar } from '@/components/library/LibraryTopBar';
import { LinkCard } from '@/components/library/LinkCard';
import { LinkDetail } from '@/components/library/LinkDetail';
import { ImportDialog } from '@/components/library/ImportDialog';
import { ShortcutsModal } from '@/components/library/ShortcutsModal';
import { SmartSearchModal } from '@/components/library/SmartSearchModal';
import { Skeleton } from '@/components/ui/skeleton';
import { callFunction } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Library() {
  const params = useParams();
  const navigate = useNavigate();
  const { data: links = [], isLoading } = useLinks();
  const view = useUI((s) => s.view);
  const [importOpen, setImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  // keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(links.length - 1, c + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === 'o' || e.key === 'Enter') {
        const l = links[cursor];
        if (l) navigate(`/library/${l.id}`);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [links, cursor, navigate]);

  function exportData(kind: 'json' | 'csv') {
    const blob =
      kind === 'json'
        ? new Blob([JSON.stringify(links, null, 2)], { type: 'application/json' })
        : new Blob(
            [
              'url,title,tags,created_at\n' +
                links
                  .map((l) =>
                    [l.url, JSON.stringify(l.title ?? ''), JSON.stringify((l.tags ?? []).join('|')), l.created_at].join(',')
                  )
                  .join('\n'),
            ],
            { type: 'text/csv' }
          );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xenonowledge-export-${Date.now()}.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function checkLinkHealth() {
    try {
      const r = await callFunction<{ ok: number; broken: number }>('link-health');
      toast.success(`Health check: ${r.ok} ok, ${r.broken} broken`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <LibrarySidebar links={links} onImport={() => setImportOpen(true)} onExport={exportData} />

      <div className="space-y-4">
        <LibraryTopBar
          onShortcuts={() => setShortcutsOpen(true)}
          onSmartSearch={() => setSmartOpen(true)}
          onLinkHealth={checkLinkHealth}
        />

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <EmptyState onImport={() => setImportOpen(true)} />
        ) : (
          <div
            className={cn(
              view === 'grid' ? 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'
            )}
          >
            <AnimatePresence>
              {links.map((l, i) => (
                <div
                  key={l.id}
                  className={cn(cursor === i && 'ring-2 ring-neon-500/40 ring-offset-2 ring-offset-background rounded-lg')}
                >
                  <LinkCard link={l} view={view} />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {params.linkId && <LinkDetail id={params.linkId} />}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SmartSearchModal open={smartOpen} onOpenChange={setSmartOpen} />
    </div>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-500/10">
        <span className="font-display text-2xl text-neon-300">⌬</span>
      </div>
      <p className="font-display text-lg font-semibold">Your library is empty</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Paste a URL above, or click <button onClick={onImport} className="underline">Import</button> to bring in your existing
        bookmarks.
      </p>
    </div>
  );
}
