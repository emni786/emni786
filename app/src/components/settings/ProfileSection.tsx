import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Section } from './Section';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export function ProfileSection() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
  }, [profile]);

  async function save() {
    try {
      await update.mutateAsync({ username, display_name: displayName, bio });
      toast.success('Profile saved');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Section index={1} title="Profile" description="Public information shown on your shareable profile page.">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ada-lovelace" />
        </div>
        <div>
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Label>Bio</Label>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Button onClick={save} disabled={update.isPending}>Save profile</Button>
        {profile?.username && (
          <Button asChild variant="outline">
            <Link to={`/u/${profile.username}`}>View public profile →</Link>
          </Button>
        )}
      </div>
    </Section>
  );
}
