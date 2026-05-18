import { useState } from 'react';
import { Section } from './Section';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function PasswordSection() {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  async function update() {
    if (pw.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success('Password updated');
      setPw('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section index={9} title="Change Password">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label>New password</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} />
        </div>
        <Button className="self-end" onClick={update} disabled={busy}>Update</Button>
      </div>
    </Section>
  );
}
