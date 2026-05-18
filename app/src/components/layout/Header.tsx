import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useUI } from '@/store/ui';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/library', label: 'Library' },
  { to: '/knowledge', label: 'Knowledge' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/digest', label: 'Digest' },
];

export function Header() {
  const theme = useUI((s) => s.theme);
  const toggleTheme = useUI((s) => s.toggleTheme);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success('Signed out');
    navigate('/auth', { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-neon-500/10 text-neon-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Settings">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
