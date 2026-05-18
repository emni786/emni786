import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Copy as CopyIcon,
  Download,
  FolderKanban,
  Inbox,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  XCircle,
  Pin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCollections, useCreateCollection, useDeleteCollection } from '@/hooks/useCollections';
import { useLibraryFilters, type SortBy, type StatusFilter } from '@/store/library';
import { computeStats } from '@/lib/stats';
import { cn } from '@/lib/utils';
import type { ContentType, Link } from '@/types/database';
import { toast } from 'sonner';

interface Props {
  links: Link[];
  onImport: () => void;
  onExport: (kind: 'json' | 'csv') => void;
}

export function LibrarySidebar({ links, onImport, onExport }: Props) {
  const filters = useLibraryFilters();
  const stats = computeStats(links, 0);
  const duplicates = links.filter((l) => l.save_count > 1).length;
  const recycle = links.filter((l) => l.deleted_at).length;
  const { data: collections = [] } = useCollections();
  const createCol = useCreateCollection();
  const delCol = useDeleteCollection();
  const [createOpen, setCreateOpen] = useState(false);
  const [colName, setColName] = useState('');

  const overview = [
    { id: 'all' as StatusFilter, label: 'Total', count: stats.total, icon: Inbox },
    { id: 'ready' as StatusFilter, label: 'Ready', count: stats.ready, icon: CheckCircle2 },
    { id: 'pending' as StatusFilter, label: 'Pending', count: stats.pending + stats.analyzing, icon: Clock },
    { id: 'failed' as StatusFilter, label: 'Failed', count: stats.failed, icon: XCircle },
    { id: 'duplicates' as StatusFilter, label: 'Duplicates', count: duplicates, icon: CopyIcon },
    { id: 'recycle' as StatusFilter, label: 'Recycle Bin', count: recycle, icon: Trash2 },
  ];

  return (
    <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
      <Section title="Overview">
        <div className="space-y-1">
          {overview.map((o) => (
            <button
              key={o.id}
              onClick={() => filters.setStatus(o.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                filters.status === o.id && 'bg-accent text-foreground'
              )}
            >
              <span className="flex items-center gap-2">
                <o.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {o.label}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{o.count}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Filters">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Content type</Label>
            <Select
              value={filters.contentType}
              onValueChange={(v) => filters.setContentType(v as ContentType | 'all')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="tool">Tools</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="repo">Repos</SelectItem>
                <SelectItem value="docs">Docs</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={filters.sortBy} onValueChange={(v) => filters.setSortBy(v as SortBy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="most-saved">Most Saved</SelectItem>
                <SelectItem value="recently-updated">Recently Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Pin className="h-3.5 w-3.5" /> Pinned only
            </span>
            <Switch checked={filters.pinnedOnly} onCheckedChange={filters.setPinnedOnly} />
          </label>
        </div>
      </Section>

      <Section
        title="Collections"
        action={
          <Button size="iconSm" variant="ghost" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        }
      >
        {collections.length === 0 && (
          <p className="text-xs text-muted-foreground">No collections yet. Create one to organise your links.</p>
        )}
        <div className="space-y-1">
          {collections.map((c) => (
            <div key={c.id} className="group flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-accent">
              <button
                onClick={() => filters.setCollectionId(filters.collectionId === c.id ? null : c.id)}
                className={cn(
                  'flex flex-1 items-center gap-2 text-left',
                  filters.collectionId === c.id && 'text-neon-300'
                )}
              >
                <FolderKanban className="h-3.5 w-3.5" style={{ color: c.color ?? undefined }} />
                <span className="truncate">{c.name}</span>
                {c.is_ai_generated && (
                  <Badge variant="info" className="ml-1 text-[9px]">
                    <Sparkles className="mr-1 h-2.5 w-2.5" /> AI
                  </Badge>
                )}
              </button>
              <button
                aria-label="Delete collection"
                className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                onClick={async () => {
                  if (!confirm(`Delete collection "${c.name}"?`)) return;
                  try {
                    await delCol.mutateAsync(c.id);
                    toast.success('Collection deleted');
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onImport}>
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onExport('json')}>
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Name</Label>
            <Input value={colName} onChange={(e) => setColName(e.target.value)} placeholder="e.g. AI tools" />
            <Button
              onClick={async () => {
                if (!colName.trim()) return;
                try {
                  await createCol.mutateAsync({ name: colName.trim() });
                  toast.success('Collection created');
                  setColName('');
                  setCreateOpen(false);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
