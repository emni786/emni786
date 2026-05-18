import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Rss } from 'lucide-react';
import { Section } from './Section';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import type { RssFeed } from '@/types/database';
import { toast } from 'sonner';
import { isValidUrl } from '@/lib/utils';

export function RssSection() {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');

  const { data: feeds = [] } = useQuery<RssFeed[]>({
    queryKey: ['rss-feeds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rss_feeds').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!isValidUrl(url)) throw new Error('Enter a valid URL');
      const { error } = await supabase.from('rss_feeds').insert({ feed_url: url, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      setUrl('');
      qc.invalidateQueries({ queryKey: ['rss-feeds'] });
      toast.success('Feed added');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rss_feeds').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rss-feeds'] }),
  });

  return (
    <Section index={5} title="RSS Feeds" description="Subscribe to RSS feeds; new items become links every 30 minutes.">
      <div className="flex gap-2">
        <Input placeholder="https://example.com/feed.xml" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Button onClick={() => add.mutate()} disabled={!url || add.isPending}>Add</Button>
      </div>
      <div className="mt-3 space-y-1">
        {feeds.length === 0 && <p className="text-sm text-muted-foreground">No feeds yet.</p>}
        {feeds.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Rss className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="truncate font-mono text-xs">{f.title || f.feed_url}</span>
            </span>
            <Button size="iconSm" variant="ghost" onClick={() => del.mutate(f.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}
