import { Section } from './Section';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';

export function AutoRetrySection() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const enabled = profile?.auto_retry_enabled ?? true;
  const interval = profile?.auto_retry_interval_hours ?? 15;

  return (
    <Section index={6} title="Auto-Retry Failed Links" description="Periodically retry links that failed analysis.">
      <div className="flex items-center justify-between">
        <Label>Enable auto-retry</Label>
        <Switch checked={enabled} onCheckedChange={(b) => update.mutate({ auto_retry_enabled: b })} />
      </div>
      <div className="mt-4">
        <Label>Retry interval: {interval}h</Label>
        <Slider
          value={[interval]}
          min={1}
          max={72}
          step={1}
          onValueChange={(v) => update.mutate({ auto_retry_interval_hours: v[0] })}
          className="mt-3"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Failed links are re-analysed if their last failure was more than {interval} hours ago.
        </p>
      </div>
    </Section>
  );
}
