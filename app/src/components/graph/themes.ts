export type GraphTheme = 'cosmos' | 'atomic' | 'sphere' | 'ocean' | 'galaxy';

export interface ThemeSpec {
  name: GraphTheme;
  label: string;
  bg: string;
  starfield: boolean;
  rings: 'glow' | 'orbit' | 'wave' | 'spiral' | 'none';
  palette: string[];
  description: string;
}

export const THEMES: Record<GraphTheme, ThemeSpec> = {
  cosmos: {
    name: 'cosmos',
    label: 'Cosmos',
    bg: '#05050b',
    starfield: true,
    rings: 'glow',
    palette: ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'],
    description: 'Planet-coloured nodes with glow rings on a starfield.',
  },
  atomic: {
    name: 'atomic',
    label: 'Atomic',
    bg: '#0a0a14',
    starfield: false,
    rings: 'orbit',
    palette: ['#22d3ee', '#a3e635', '#facc15', '#f97316', '#e11d48'],
    description: 'Orbiting electron rings around each node.',
  },
  sphere: {
    name: 'sphere',
    label: 'Sphere',
    bg: '#08080d',
    starfield: false,
    rings: 'none',
    palette: ['#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fbbf24'],
    description: 'Nodes laid on a sphere with even distribution.',
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    bg: '#031b2e',
    starfield: false,
    rings: 'wave',
    palette: ['#0ea5e9', '#22d3ee', '#06b6d4', '#0891b2', '#0369a1', '#67e8f9'],
    description: 'Blue gradient with subtle wave motion.',
  },
  galaxy: {
    name: 'galaxy',
    label: 'Galaxy',
    bg: '#04020c',
    starfield: true,
    rings: 'spiral',
    palette: ['#7c3aed', '#a855f7', '#d946ef', '#ec4899', '#f59e0b', '#22d3ee'],
    description: 'Spiral arrangement with deep-space colours.',
  },
};

export function colorForGroup(theme: ThemeSpec, group: number): string {
  return theme.palette[group % theme.palette.length];
}
