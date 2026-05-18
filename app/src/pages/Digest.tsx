import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLinks } from '@/hooks/useLinks';
import { useAuth } from '@/hooks/useAuth';
import { callFunction, supabase } from '@/lib/supabase';
import { contentMix, topDomains, topTags } from '@/lib/stats';
import { formatRelative, getDomain, getFavicon } from '@/lib/utils';
import type { DigestSettings, DigestFrequency } from '@/types/database';
import { toast } from 'sonner';

export default function Digest() {
  const { user } = useAuth();
  const { data: links = [], isLoading } = useLinks();
  const qc = useQueryClient();

  const { data: settings } = useQuery<DigestSettings | null>({
    queryKey: ['digest-settings', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('digest_settings').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<DigestSettings>) => {
      const { error } = await supabase
        .from('digest_settings')
        .upsert({ user_id: user!.id, frequency: settings?.frequency ?? 'weekly', email_enabled: settings?.email_enabled ?? true, ...patch }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['digest-settings'] }),
  });

  const sendNow = useMutation({
    mutationFn: () => callFunction('send-digest', { force: true }),
    onSuccess: () => toast.success('Digest queued'),
    onError: (e) => toast.error((e as Error).message),
  });

  const period = settings?.frequency ?? 'weekly';
  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  const cutoff = Date.now() - days * 86400_000;
  const newLinks = useMemo(() => links.filter((l) => new Date(l.created_at).getTime() >= cutoff), [links, cutoff]);
  const broken = links.filter((l) => l.http_status && l.http_status >= 400).length;

  const tags = topTags(newLinks, 10);
  const mix = contentMix(newLinks);
  const domains = topDomains(newLinks, 5);

  if (isLoading) return <Skeleton className="h-screen w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-5 w-5 text-neon-300" /> Digest
          </h1>
          <p className="text-sm text-muted-foreground">A curated summary of your library, on your schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => updateSettings.mutate({ frequency: v as DigestFrequency })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            Email
            <Switch
              checked={settings?.email_enabled ?? true}
              onCheckedChange={(b) => updateSettings.mutate({ email_enabled: b })}
            />
          </label>
          <Button onClick={() => sendNow.mutate()} disabled={sendNow.isPending}>
            <Send className="h-4 w-4" /> Send Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="New Links" value={newLinks.length} />
        <StatTile label="Total Library" value={links.length} />
        <StatTile label="Broken" value={broken} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Trending Tags</CardTitle></CardHeader>
        <CardContent>
          {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags this period.</p>}
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t.tag} variant="secondary">{t.tag} <span className="ml-1 text-muted-foreground">×{t.count}</span></Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Content Types</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {mix.length === 0 && <p className="text-muted-foreground">Nothing to break down yet.</p>}
            {mix.map((m) => (
              <div key={m.type} className="flex items-center justify-between">
                <span className="capitalize">{m.type}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Domains</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {domains.length === 0 && <p className="text-muted-foreground">No domains this period.</p>}
            {domains.map((d) => (
              <div key={d.domain} className="flex items-center justify-between">
                <span className="font-mono text-xs">{d.domain}</span>
                <span className="font-mono text-xs text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recently Saved</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {newLinks.slice(0, 12).map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent">
              <img src={l.favicon || getFavicon(l.url)} alt="" className="h-4 w-4 rounded" />
              <span className="min-w-0 flex-1 truncate">{l.title || l.url}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{getDomain(l.url)} · {formatRelative(l.created_at)}</span>
            </a>
          ))}
          {newLinks.length === 0 && <p className="text-sm text-muted-foreground">Nothing new this period.</p>}
        </CardContent>
      </Card>

      {settings?.last_sent_at && (
        <p className="text-xs text-muted-foreground">Last digest sent {formatRelative(settings.last_sent_at)}.</p>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="font-display text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
