import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Copy as CopyIcon,
  Edit3,
  ExternalLink,
  Pin,
  PinOff,
  Share2,
  Trash2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Link as LinkRow } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn, formatRelative, getDomain, getFavicon } from '@/lib/utils';
import { useSoftDeleteLink, useTogglePin } from '@/hooks/useLinks';
import { useUI } from '@/store/ui';
import { toast } from 'sonner';

interface Props {
  link: LinkRow;
  view: 'grid' | 'list';
}

export function LinkCard({ link, view }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selectMode = useUI((s) => s.selectMode);
  const selected = useUI((s) => s.selected);
  const toggleSelect = useUI((s) => s.toggleSelect);
  const del = useSoftDeleteLink();
  const togglePin = useTogglePin();

  const tags = (link.tags ?? []).slice(0, 4);
  const extraTags = Math.max(0, (link.tags?.length ?? 0) - 4);
  const isSelected = selected.has(link.id);
  const isReady = link.status === 'ready';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-neon-500/40',
        isSelected && 'border-neon-500/70 bg-neon-500/5',
        view === 'list' && 'flex-row items-stretch'
      )}
    >
      {selectMode && (
        <div className="absolute left-2 top-2 z-10">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(link.id)} />
        </div>
      )}

      {link.is_pinned && (
        <Pin className="absolute right-2 top-2 z-10 h-3.5 w-3.5 fill-neon-500 text-neon-500" />
      )}

      {/* OG image when in grid */}
      {view === 'grid' && link.og_image && (
        <a href={link.url} target="_blank" rel="noreferrer" className="block aspect-[16/9] w-full overflow-hidden bg-muted">
          <img src={link.og_image} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        </a>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <img
            src={link.favicon || getFavicon(link.url)}
            alt=""
            className="h-4 w-4 shrink-0 rounded"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 font-medium leading-snug hover:text-neon-300"
            >
              {link.title || link.url}
            </a>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{getDomain(link.url)}</p>
          </div>
          {!isReady && (
            <Badge variant={link.status === 'failed' ? 'destructive' : 'warning'} className="shrink-0 text-[9px]">
              {link.status}
            </Badge>
          )}
        </div>

        {link.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{link.description}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
            {extraTags > 0 && (
              <Badge variant="outline" className="text-[10px]">+{extraTags}</Badge>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatRelative(link.created_at)}</span>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <IconBtn label="Open" onClick={() => window.open(link.url, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Copy" onClick={async () => { await navigator.clipboard.writeText(link.url); toast.success('Copied'); }}>
              <CopyIcon className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              label={link.is_pinned ? 'Unpin' : 'Pin'}
              onClick={async () => {
                await togglePin.mutateAsync({ id: link.id, is_pinned: !link.is_pinned });
                toast.success(link.is_pinned ? 'Unpinned' : 'Pinned');
              }}
            >
              {link.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </IconBtn>
            <IconBtn label="Edit" asChild>
              <RouterLink to={`/library/${link.id}`}>
                <Edit3 className="h-3.5 w-3.5" />
              </RouterLink>
            </IconBtn>
            <IconBtn
              label="Share"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/library/${link.id}`);
                toast.success('Link copied');
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn
              label="Delete"
              onClick={async () => {
                if (!confirm('Move to recycle bin?')) return;
                await del.mutateAsync(link.id);
                toast.success('Moved to recycle bin');
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </div>

        {link.key_points?.length > 0 && (
          <button
            className="mt-3 flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Hide key points' : `Show ${link.key_points.length} key points`}
          </button>
        )}
        {expanded && (
          <ul className="mt-2 space-y-1 text-sm">
            {link.key_points.map((p, i) => (
              <li key={i} className="flex gap-2 text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neon-500" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function IconBtn({
  label,
  children,
  onClick,
  asChild,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  asChild?: boolean;
}) {
  return (
    <Button variant="ghost" size="iconSm" onClick={onClick} aria-label={label} title={label} asChild={asChild}>
      {children}
    </Button>
  );
}
