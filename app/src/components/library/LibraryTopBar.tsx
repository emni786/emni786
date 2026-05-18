import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckSquare,
  Compass,
  Grid3x3,
  Keyboard,
  List,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLibraryFilters } from '@/store/library';
import { useUI } from '@/store/ui';
import { useIngestLink } from '@/hooks/useLinks';
import { useQueryClient } from '@tanstack/react-query';
import { isValidUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Props {
  onShortcuts: () => void;
  onSmartSearch: () => void;
  onLinkHealth: () => void;
}

export function LibraryTopBar({ onShortcuts, onSmartSearch, onLinkHealth }: Props) {
  const search = useLibraryFilters((s) => s.search);
  const setSearch = useLibraryFilters((s) => s.setSearch);
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const selectMode = useUI((s) => s.selectMode);
  const setSelectMode = useUI((s) => s.setSelectMode);
  const ingest = useIngestLink();
  const qc = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');

  // global '/' shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'v') setView(view === 'grid' ? 'list' : 'grid');
      if (e.key === '?') onShortcuts();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setView, view, onShortcuts]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl(url)) {
      toast.error('Enter a valid URL');
      return;
    }
    try {
      const r = await ingest.mutateAsync({ url, source: 'manual' });
      toast.success(r.duplicate ? 'Already saved — count incremented' : 'Saved! Analyzing…');
      setUrl('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <form onSubmit={add} className="flex flex-1 gap-2">
        <Input
          type="url"
          placeholder="Paste a URL to save…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-sm"
        />
        <Button type="submit" disabled={ingest.isPending}>
          Save
        </Button>
      </form>

      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Search your library…  (press /)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-1">
        <ToolBtn label="AI Smart Search" onClick={onSmartSearch} icon={<Sparkles className="h-4 w-4" />} />
        <ToolBtn label="Knowledge Discovery" icon={<Compass className="h-4 w-4" />} asChild>
          <Link to="/knowledge" />
        </ToolBtn>
        <ToolBtn label="Link Health" onClick={onLinkHealth} icon={<Activity className="h-4 w-4" />} />
        <ToolBtn
          label="Refresh"
          onClick={() => qc.invalidateQueries({ queryKey: ['links'] })}
          icon={<RefreshCw className="h-4 w-4" />}
        />
        <ToolBtn label="Shortcuts (?)" onClick={onShortcuts} icon={<Keyboard className="h-4 w-4" />} />
        <ToolBtn
          label="Select mode"
          onClick={() => setSelectMode(!selectMode)}
          icon={<CheckSquare className={`h-4 w-4 ${selectMode ? 'text-neon-400' : ''}`} />}
        />
        <ToolBtn
          label={view === 'grid' ? 'List view (v)' : 'Grid view (v)'}
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          icon={view === 'grid' ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  icon,
  onClick,
  asChild,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  asChild?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} asChild={asChild} aria-label={label}>
          {asChild ? children : icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
