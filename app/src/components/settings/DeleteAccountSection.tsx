import { useState } from 'react';
import { Section } from './Section';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { callFunction, supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function DeleteAccountSection() {
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();
  const armed = confirm === 'DELETE';

  async function destroy() {
    try {
      await callFunction('ingest-link', { action: 'delete-account' });
      await supabase.auth.signOut();
      toast.success('Account deleted');
      navigate('/auth', { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Section
      index={10}
      title="Delete Account"
      description="Permanently delete your account and every link, collection, and setting. This cannot be undone."
      className="border-destructive/40 bg-destructive/5"
    >
      <p className="mb-2 text-sm">Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm.</p>
      <div className="flex gap-2">
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="DELETE"
          className="font-mono"
        />
        <Button variant="destructive" disabled={!armed} onClick={destroy}>
          Delete my account
        </Button>
      </div>
    </Section>
  );
}
