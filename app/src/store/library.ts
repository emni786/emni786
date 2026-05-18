import { create } from 'zustand';
import type { ContentType, LinkStatus } from '@/types/database';

export type SortBy = 'newest' | 'oldest' | 'title-asc' | 'most-saved' | 'recently-updated';
export type StatusFilter = LinkStatus | 'all' | 'duplicates' | 'recycle';

interface LibraryState {
  search: string;
  setSearch: (s: string) => void;
  contentType: ContentType | 'all';
  setContentType: (c: ContentType | 'all') => void;
  status: StatusFilter;
  setStatus: (s: StatusFilter) => void;
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  pinnedOnly: boolean;
  setPinnedOnly: (b: boolean) => void;
  collectionId: string | null;
  setCollectionId: (id: string | null) => void;
  reset: () => void;
}

export const useLibraryFilters = create<LibraryState>((set) => ({
  search: '',
  setSearch: (search) => set({ search }),
  contentType: 'all',
  setContentType: (contentType) => set({ contentType }),
  status: 'all',
  setStatus: (status) => set({ status }),
  sortBy: 'newest',
  setSortBy: (sortBy) => set({ sortBy }),
  pinnedOnly: false,
  setPinnedOnly: (pinnedOnly) => set({ pinnedOnly }),
  collectionId: null,
  setCollectionId: (collectionId) => set({ collectionId }),
  reset: () =>
    set({
      search: '',
      contentType: 'all',
      status: 'all',
      sortBy: 'newest',
      pinnedOnly: false,
      collectionId: null,
    }),
}));
