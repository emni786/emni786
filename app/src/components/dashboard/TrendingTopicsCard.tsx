import { useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { callFunction } from '@/lib/supabase';
import { toast } from 'sonner';

interface Topic {
  topic: string;
  score: number;
  reason?: string;
}

export function TrendingTopicsCard() {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const data = await callFunction<{ topics: Topic[] }>('ai-discover', { mode: 'trending', period: 'today' });
      setTopics(data.topics);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-neon-300" />
          Trending Topics
        </CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={busy}>
          {busy ? '…' : 'Load Trends'}
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {!topics && <p className="text-sm text-muted-foreground">Tap "Load Trends" to ask the AI what's hot.</p>}
        <div className="flex flex-wrap gap-1.5">
          {topics?.map((t) => (
            <Badge key={t.topic} variant="default" title={t.reason}>
              <Sparkles className="mr-1 h-3 w-3" /> {t.topic}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
