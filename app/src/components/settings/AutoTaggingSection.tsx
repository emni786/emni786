import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Section } from './Section';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import type { AutoTagCondition, AutoTaggingRule } from '@/types/database';
import { toast } from 'sonner';

const CONDITIONS: { value: AutoTagCondition; label: string }[] = [
  { value: 'domain_contains', label: 'Domain contains' },
  { value: 'url_contains', label: 'URL contains' },
  { value: 'title_contains', label: 'Title contains' },
  { value: 'content_type_is', label: 'Content type is' },
];

export function AutoTaggingSection() {
  const qc = useQueryClient();
  const [cond, setCond] = useState<AutoTagCondition>('domain_contains');
  const [value, setValue] = useState('');
  const [tag, setTag] = useState('');

  const { data: rules = [] } = useQuery<AutoTaggingRule[]>({
    queryKey: ['auto-tag-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_tagging_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('auto_tagging_rules').insert({
        condition_type: cond,
        condition_value: value.trim(),
        tag_to_add: tag.trim().toLowerCase(),
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setValue('');
      setTag('');
      qc.invalidateQueries({ queryKey: ['auto-tag-rules'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('auto_tagging_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auto-tag-rules'] }),
  });

  return (
    <Section index={4} title="Auto-Tagging Rules" description="Apply tags automatically when a saved link matches a condition.">
      <div className="grid gap-2 md:grid-cols-[180px_1fr_180px_auto]">
        <Select value={cond} onValueChange={(v) => setCond(v as AutoTagCondition)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="value (e.g. github.com)" value={value} onChange={(e) => setValue(e.target.value)} />
        <Input placeholder="tag to add" value={tag} onChange={(e) => setTag(e.target.value)} />
        <Button
          onClick={() => add.mutate()}
          disabled={!value.trim() || !tag.trim() || add.isPending}
        >+ Add</Button>
      </div>

      <div className="mt-4 space-y-1">
        {rules.length === 0 && <p className="text-sm text-muted-foreground">No rules yet.</p>}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{CONDITIONS.find((c) => c.value === r.condition_type)?.label}</Badge>
              <span className="font-mono">{r.condition_value}</span>
              <span className="text-muted-foreground">→</span>
              <Badge>{r.tag_to_add}</Badge>
            </span>
            <Button size="iconSm" variant="ghost" onClick={() => del.mutate(r.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}
