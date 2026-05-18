import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useIngestLink } from '@/hooks/useLinks';
import { isValidUrl } from '@/lib/utils';
import { toast } from 'sonner';

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ingest = useIngestLink();

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  async function bulkAdd() {
    setBusy(true);
    let ok = 0;
    let dup = 0;
    let bad = 0;
    for (const url of lines) {
      if (!isValidUrl(url)) {
        bad += 1;
        continue;
      }
      try {
        const r = await ingest.mutateAsync({ url, source: 'bulk' });
        if (r.duplicate) dup += 1;
        else ok += 1;
      } catch {
        bad += 1;
      }
    }
    setBusy(false);
    toast.success(`Imported ${ok} new · ${dup} duplicates · ${bad} skipped`);
    setText('');
    onOpenChange(false);
  }

  async function handleFile(file: File) {
    setBusy(true);
    const t = await file.text();
    let urls: string[] = [];
    if (file.name.endsWith('.html')) {
      urls = Array.from(t.matchAll(/href="(https?:\/\/[^"]+)"/g)).map((m) => m[1]);
    } else if (file.name.endsWith('.csv')) {
      urls = t
        .split('\n')
        .map((l) => l.split(',')[0].trim().replace(/^"|"$/g, ''))
        .filter((u) => isValidUrl(u));
    } else {
      urls = t
        .split('\n')
        .map((l) => l.trim())
        .filter((u) => isValidUrl(u));
    }
    setBusy(false);
    setText(urls.join('\n'));
    toast.success(`Found ${urls.length} URLs — click "Add All" to import.`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import links</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="bulk">
          <TabsList>
            <TabsTrigger value="bulk">Bulk paste</TabsTrigger>
            <TabsTrigger value="file">File (.html / .csv)</TabsTrigger>
          </TabsList>
          <TabsContent value="bulk">
            <div className="mb-2 text-xs text-muted-foreground">{lines.length} lines</div>
            <Textarea
              rows={10}
              placeholder="One URL per line"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-sm"
            />
            <Button className="mt-3" onClick={bulkAdd} disabled={busy || lines.length === 0}>
              Add All
            </Button>
          </TabsContent>
          <TabsContent value="file">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-accent"
            >
              Drag a Chrome `.html` bookmarks export or a `.csv` file here
              <input
                type="file"
                accept=".html,.csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <span className="text-xs underline">or click to choose</span>
            </label>
            {lines.length > 0 && (
              <Button className="mt-3" onClick={bulkAdd} disabled={busy}>
                Add {lines.length} URLs
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
