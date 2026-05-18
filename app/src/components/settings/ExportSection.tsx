import { Section } from './Section';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useLinks } from '@/hooks/useLinks';

export function ExportSection() {
  const { data: links = [] } = useLinks();

  function download(kind: 'json' | 'csv') {
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

  return (
    <Section index={7} title="Export Data" description="Download a copy of every link in your library.">
      <div className="flex gap-2">
        <Button onClick={() => download('json')}>
          <Download className="h-4 w-4" /> Export JSON
        </Button>
        <Button onClick={() => download('csv')} variant="outline">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
    </Section>
  );
}
