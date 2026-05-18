import { useEffect } from 'react';
import { useUI } from '@/store/ui';

export function ThemeBoot() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}
