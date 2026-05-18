import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface UIState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  view: 'grid' | 'list';
  setView: (v: 'grid' | 'list') => void;
  selectMode: boolean;
  setSelectMode: (b: boolean) => void;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
  graphTheme: 'cosmos' | 'atomic' | 'sphere' | 'ocean' | 'galaxy';
  setGraphTheme: (t: UIState['graphTheme']) => void;
  graph3D: boolean;
  setGraph3D: (b: boolean) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
      view: 'grid',
      setView: (view) => set({ view }),
      selectMode: false,
      setSelectMode: (selectMode) => set({ selectMode, selected: new Set() }),
      selected: new Set<string>(),
      toggleSelect: (id) => {
        const s = new Set(get().selected);
        s.has(id) ? s.delete(id) : s.add(id);
        set({ selected: s });
      },
      clearSelection: () => set({ selected: new Set() }),
      sidebarOpen: true,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      graphTheme: 'cosmos',
      setGraphTheme: (graphTheme) => set({ graphTheme }),
      graph3D: true,
      setGraph3D: (graph3D) => set({ graph3D }),
    }),
    {
      name: 'xenon-ui',
      partialize: (s) => ({ theme: s.theme, view: s.view, graphTheme: s.graphTheme, graph3D: s.graph3D }),
    }
  )
);
