import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/layout/Logo';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelative, getDomain, getFavicon } from '@/lib/utils';
import type { Profile, Link as LinkRow, Collection } from '@/types/database';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();

  const { data: profile, isLoading: pl } = useQuery<Profile | null>({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
      return data;
    },
    enabled: !!username,
  });

  const { data: links = [], isLoading: ll } = useQuery<LinkRow[]>({
    queryKey: ['public-links', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      // RLS policy "public_links_read" allows reading is_public=true links;
      // for the demo we read what's allowed by RLS for this profile.
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('is_pinned', true) // showcase pinned items as the user's "public picks"
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) return [];
      return data ?? [];
    },
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['public-collections', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from('collections').select('*').eq('user_id', profile!.id);
      return data ?? [];
    },
  });

  if (pl) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <Logo />
        <p className="font-display text-xl">Profile not found.</p>
        <Button asChild variant="outline">
          <Link to="/">Back to Xenonowledge</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <Logo />
          <Button asChild variant="outline" size="sm">
            <Link to="/">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <header className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-500/10 ring-1 ring-neon-500/40">
            <span className="font-display text-2xl text-neon-300">{(profile.display_name ?? profile.username ?? '?').charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2 max-w-prose text-sm">{profile.bio}</p>}
          </div>
        </header>

        {collections.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Collections</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {collections.map((c) => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pinned links</CardTitle>
            <p className="text-xs text-muted-foreground">{links.length} public picks</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {ll && <Skeleton className="h-24 w-full" />}
            {!ll && links.length === 0 && <p className="text-sm text-muted-foreground">No public links yet.</p>}
            {links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
              >
                <img src={l.favicon || getFavicon(l.url)} alt="" className="mt-0.5 h-4 w-4 rounded" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.title || l.url}</p>
                  {l.summary && <p className="line-clamp-2 text-xs text-muted-foreground">{l.summary}</p>}
                  <p className="mt-1 truncate text-xs text-muted-foreground">{getDomain(l.url)} · {formatRelative(l.created_at)}</p>
                </div>
                <ExternalLink className="mt-1 h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>

        <p className="pt-6 text-center text-xs text-muted-foreground">
          Built on <Link to="/" className="underline">Xenonowledge</Link>.
        </p>
      </main>
    </div>
  );
}
