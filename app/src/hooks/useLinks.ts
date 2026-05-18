import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase, callFunction } from '@/lib/supabase';
import type { Link } from '@/types/database';
import { useLibraryFilters } from '@/store/library';

const SELECT = '*';

export function useLinks() {
  const { search, contentType, status, sortBy, pinnedOnly, collectionId } = useLibraryFilters();
  const qc = useQueryClient();

  // realtime subscription so analyzing -> ready transitions show live
  useEffect(() => {
    const ch = supabase
      .channel('links-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        qc.invalidateQueries({ queryKey: ['links'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return useQuery<Link[]>({
    queryKey: ['links', { search, contentType, status, sortBy, pinnedOnly, collectionId }],
    queryFn: async () => {
      let q = supabase.from('links').select(SELECT).is('deleted_at', null);

      if (status === 'recycle') {
        q = supabase.from('links').select(SELECT).not('deleted_at', 'is', null);
      } else if (status === 'duplicates') {
        q = q.gt('save_count', 1);
      } else if (status !== 'all') {
        q = q.eq('status', status);
      }

      if (contentType !== 'all') q = q.eq('content_type', contentType);
      if (pinnedOnly) q = q.eq('is_pinned', true);

      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`title.ilike.${s},description.ilike.${s},summary.ilike.${s},url.ilike.${s}`);
      }

      switch (sortBy) {
        case 'oldest':
          q = q.order('created_at', { ascending: true });
          break;
        case 'title-asc':
          q = q.order('title', { ascending: true });
          break;
        case 'most-saved':
          q = q.order('save_count', { ascending: false });
          break;
        case 'recently-updated':
          q = q.order('updated_at', { ascending: false });
          break;
        default:
          q = q.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
      }

      if (collectionId) {
        const { data: ids } = await supabase
          .from('collection_links')
          .select('link_id')
          .eq('collection_id', collectionId);
        const idList = (ids ?? []).map((r) => r.link_id);
        if (idList.length === 0) return [];
        q = q.in('id', idList);
      }

      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLink(id: string | null) {
  return useQuery<Link | null>({
    queryKey: ['link', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('links').select(SELECT).eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useIngestLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { url: string; source?: string }) => {
      return callFunction<{ id: string; duplicate: boolean }>('ingest-link', input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}

export function useUpdateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<Link>) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from('links').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['links'] });
      qc.invalidateQueries({ queryKey: ['link', vars.id] });
    },
  });
}

export function useSoftDeleteLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('links').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}

export function useTogglePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase.from('links').update({ is_pinned: input.is_pinned }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  });
}
