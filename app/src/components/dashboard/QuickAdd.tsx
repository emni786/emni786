import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIngestLink } from '@/hooks/useLinks';
import { isValidUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLibraryFilters } from '@/store/library';

export function QuickAdd() {
  const [url, setUrl] = useState('');
  const ingest = useIngestLink();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUrl(url)) {
      toast.error('Enter a valid URL');
      return;
    }
    try {
      const r = await ingest.mutateAsync({ url, source: 'manual' });
      toast.success(r.duplicate ? 'Already saved — count incremented' : 'Saved! Analyzing…');
      setUrl('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4 text-neon-300" />
          Quick Add
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="font-mono text-sm"
          />
          <Button type="submit" disabled={ingest.isPending}>
            Save
          </Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Paste any URL — AI summarises and tags it for you.</p>
      </CardContent>
    </Card>
  );
}

export function QuickSearch() {
  const navigate = useNavigate();
  const setSearch = useLibraryFilters((s) => s.setSearch);
  const [q, setQ] = useState('');
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4 text-neon-300" />
          Search Library
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            navigate('/library');
          }}
          className="flex gap-2"
        >
          <Input placeholder="Search across all your links" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="outline">
            Go
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
