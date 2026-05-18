import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Section } from './Section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { callFunction, supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { AlertTriangle, Copy as CopyIcon, Trash2 } from 'lucide-react';
import type { ExtensionToken } from '@/types/database';

const EXTENSION_ZIP_PATH = 'extension/xenonowledge-extension.zip';

export function ExtensionSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const { data: tokens = [] } = useQuery<ExtensionToken[]>({
    queryKey: ['extension-tokens', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('extension_tokens')
        .select('*')
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      return callFunction<{ token: string }>('ingest-link', { action: 'create-extension-token', label: 'Extension' });
    },
    onSuccess: (r) => {
      setRevealedToken(r.token);
      qc.invalidateQueries({ queryKey: ['extension-tokens'] });
      toast.success('Token generated. Copy it now — it will not be shown again.');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('extension_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extension-tokens'] });
      toast.success('Token revoked');
    },
  });

  async function downloadZip() {
    try {
      const { data, error } = await supabase.storage.from('public').createSignedUrl(EXTENSION_ZIP_PATH, 60);
      if (error || !data?.signedUrl) throw error ?? new Error('not available');
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      toast.error('Extension zip not yet uploaded to storage. See README → Browser extension.');
    }
  }

  const projectUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const bookmarklet = `javascript:void(fetch('${projectUrl}/functions/v1/ingest-link',{method:'POST',headers:{'Content-Type':'application/json','x-extension-token':prompt('Token?')||''},body:JSON.stringify({url:location.href,source:'bookmarklet'})}).then(()=>alert('Saved!')).catch(()=>alert('Failed')))`;

  return (
    <Section index={3} title="Browser Extension" description="One-click save from any tab. Or use the bookmarklet for any browser.">
      <Tabs defaultValue="extension">
        <TabsList>
          <TabsTrigger value="extension">Extension</TabsTrigger>
          <TabsTrigger value="bookmarklet">Bookmarklet</TabsTrigger>
        </TabsList>

        <TabsContent value="extension" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="font-display text-sm font-semibold">1. Download</p>
              <p className="text-xs text-muted-foreground">Get the latest .zip for Chrome/Edge.</p>
              <Button className="mt-3" onClick={downloadZip}>Download Extension (.zip)</Button>
            </div>
            <div className="rounded-md border p-4">
              <p className="font-display text-sm font-semibold">2. Install</p>
              <ol className="ml-4 list-decimal text-xs text-muted-foreground">
                <li>Open <code>chrome://extensions</code></li>
                <li>Enable Developer mode (top-right)</li>
                <li>Click "Load unpacked" and select the unzipped folder</li>
              </ol>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="font-display text-sm font-semibold">3. Configure</p>
            <div>
              <label className="text-xs text-muted-foreground">Project URL</label>
              <Input readOnly value={projectUrl} className="font-mono text-xs" />
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-300">
              <AlertTriangle className="mb-1 inline-block h-3.5 w-3.5" /> Extension Access Token: permanent until revoked.
              Anyone with this token can save links to your library.
            </div>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>Generate token</Button>
            {revealedToken && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 font-mono text-xs">
                <span className="flex-1 break-all">{revealedToken}</span>
                <Button
                  size="iconSm"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(revealedToken).then(() => toast.success('Copied'))}
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <div className="space-y-1">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                  <span className="font-mono text-muted-foreground">{t.token_prefix}…</span>
                  <span className="text-muted-foreground">{t.label}</span>
                  <Badge variant="outline">last used {t.last_used_at ? new Date(t.last_used_at).toLocaleDateString() : '—'}</Badge>
                  <Button size="iconSm" variant="ghost" onClick={() => revoke.mutate(t.id)} aria-label="Revoke">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bookmarklet" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Drag this link to your bookmarks bar. Click it on any page to save.
          </p>
          <a
            href={bookmarklet}
            onClick={(e) => e.preventDefault()}
            draggable
            className="inline-block rounded-md border border-neon-500/40 bg-neon-500/10 px-4 py-2 font-display text-sm text-neon-300 hover:bg-neon-500/20"
          >
            ⌬ Save to Xenonowledge
          </a>
          <p className="text-xs text-muted-foreground">
            On click it will prompt for your token, then POST the active URL to the ingest endpoint.
          </p>
        </TabsContent>
      </Tabs>
    </Section>
  );
}
