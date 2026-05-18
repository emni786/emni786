import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Section } from './Section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { callFunction, supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import type { TelegramIntegration } from '@/types/database';

export function TelegramSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [token, setToken] = useState('');

  const { data: integration } = useQuery<TelegramIntegration | null>({
    queryKey: ['telegram', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('telegram_integrations').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const saveToken = useMutation({
    mutationFn: () => callFunction('telegram-webhook', { action: 'save-token', bot_token: token }),
    onSuccess: () => {
      toast.success('Bot token saved (encrypted)');
      setToken('');
      qc.invalidateQueries({ queryKey: ['telegram'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const activate = useMutation({
    mutationFn: () => callFunction('telegram-webhook', { action: 'activate' }),
    onSuccess: () => {
      toast.success('Webhook activated');
      qc.invalidateQueries({ queryKey: ['telegram'] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Section
      index={2}
      title="Telegram Bot"
      description="Forward links from any chat to your library by mentioning your bot."
    >
      <ol className="space-y-4">
        <Step n={1} done>
          <p className="font-medium">Create a bot at @BotFather on Telegram.</p>
          <p className="text-xs text-muted-foreground">Run <code className="rounded bg-muted px-1 py-0.5">/newbot</code>, follow the prompts, copy the access token.</p>
        </Step>
        <Step n={2} done={!!integration}>
          <p className="font-medium">Paste the bot token (stored encrypted).</p>
          <div className="mt-2 flex gap-2">
            <Input
              type="password"
              placeholder={integration ? '•••••••••••• (saved)' : '123456:ABC-...'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-xs"
            />
            <Button onClick={() => saveToken.mutate()} disabled={!token || saveToken.isPending}>Save</Button>
          </div>
        </Step>
        <Step n={3} done={integration?.webhook_active}>
          <p className="font-medium">Activate the webhook.</p>
          <p className="text-xs text-muted-foreground">
            We call Telegram's setWebhook pointing to /functions/v1/telegram-webhook with a secret_token.
          </p>
          <Button onClick={() => activate.mutate()} disabled={!integration || activate.isPending} className="mt-2" variant="outline">
            {integration?.webhook_active ? 'Re-activate' : 'Activate Webhook'}
          </Button>
          {integration?.webhook_active && (
            <Badge variant="default" className="ml-2"><Check className="mr-1 h-3 w-3" /> Active</Badge>
          )}
        </Step>
        <Step n={4}>
          <p className="font-medium">Add the bot as admin to a group/channel.</p>
          <p className="text-xs text-muted-foreground">
            Any URL it sees in messages becomes a link in your library (source=telegram).
          </p>
        </Step>
      </ol>
    </Section>
  );
}

function Step({ n, done, children }: { n: number; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
          done ? 'border-neon-500 bg-neon-500/10 text-neon-300' : 'border-border text-muted-foreground'
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : n}
      </span>
      <div className="flex-1">{children}</div>
    </li>
  );
}
