import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import { Section } from './Section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatRelative } from '@/lib/utils';
import { toast } from 'sonner';

interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
  ip: string | null;
  is_current: boolean;
}

export function SessionsSection() {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);

  async function load() {
    // sessions_view is a view exposing auth.sessions row-level-filtered to the user
    const { data, error } = await supabase.from('sessions_view').select('*').order('updated_at', { ascending: false });
    if (error) {
      setSessions([]);
      return;
    }
    const current = session?.access_token ?? '';
    setSessions((data ?? []).map((s) => ({ ...s, is_current: s.id === current })));
  }

  useEffect(() => {
    load();
  }, [session]);

  async function signOutAll() {
    await supabase.auth.signOut({ scope: 'global' });
    toast.success('Signed out everywhere');
  }
  async function signOutOthers() {
    await supabase.auth.signOut({ scope: 'others' });
    toast.success('Signed out other sessions');
    load();
  }
  async function signOutLocal() {
    await supabase.auth.signOut({ scope: 'local' });
    toast.success('Signed out this device');
  }

  return (
    <Section index={8} title="Active Sessions" description="Devices currently signed into your account.">
      <div className="space-y-2">
        {sessions === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {sessions?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sessions view not configured — see the SQL migrations to enable it.
          </p>
        )}
        {sessions?.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{s.user_agent ?? 'Unknown device'}</p>
                <p className="text-xs text-muted-foreground">
                  {s.ip ?? 'Unknown IP'} · last active {formatRelative(s.updated_at)}
                </p>
              </div>
            </div>
            {s.is_current && <Badge variant="default">Current</Badge>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={signOutOthers}>Sign out all OTHER devices</Button>
        <Button variant="outline" onClick={signOutLocal}>Sign out this device</Button>
        <Button variant="destructive" onClick={signOutAll}>Sign out everywhere</Button>
      </div>
    </Section>
  );
}
